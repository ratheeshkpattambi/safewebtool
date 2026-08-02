#!/usr/bin/env node
/**
 * Mirror pinned Hugging Face model files into the Cloudflare R2 bucket.
 *
 *   npm run sync:models                 # sync every model in MODELS
 *   npm run sync:models -- whisper-base # sync one
 *   npm run sync:models -- --dry-run    # show the plan, upload nothing
 *   npm run sync:models -- --force      # re-upload even if sizes already match
 *
 * The mirror layout is byte-identical to the Hub's — `<repo>/resolve/<sha>/<file>`
 * — so Transformers.js only needs `env.remoteHost` changed and can fall back to
 * huggingface.co by unsetting VITE_MODEL_HOST.
 *
 * Signs S3 requests with SigV4 using Node's built-in crypto rather than pulling in
 * the AWS SDK (CLAUDE.md cardinal rule 4: no heavy libraries). Every file we mirror
 * is well under R2's 300 MB single-PUT limit, so no multipart handling is needed.
 *
 * Never runs in CI and never touches the browser bundle — the credentials it uses
 * are write credentials and must stay on your machine.
 */

import { createHash, createHmac } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MIRRORED_MODEL_KEYS, STATIC_ASSETS, getModel, HF_HOST } from '../src/common/ml-models.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const CONTENT_TYPES = {
  json: 'application/json',
  txt: 'text/plain; charset=utf-8',
  onnx: 'application/octet-stream',
  bin: 'application/octet-stream',
  jinja: 'text/plain; charset=utf-8',
};

/* -------------------------------------------------------------------------- */
/* env                                                                         */
/* -------------------------------------------------------------------------- */

/** Minimal .env reader — avoids a dotenv dependency for four variables. */
function loadDotEnv() {
  const path = resolve(repoRoot, '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue; // real env wins
    process.env[key] = rawValue.replace(/^["']|["']$/g, '').trim();
  }
}

/** Fail loudly and specifically — a half-configured sync is worse than none. */
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`\nMissing ${name}.`);
    console.error('Copy .env.example to .env and fill in the R2 credentials.');
    console.error('See documentation/self-hosted-ml-models.md\n');
    process.exit(1);
  }
  return value;
}

/* -------------------------------------------------------------------------- */
/* AWS SigV4                                                                   */
/* -------------------------------------------------------------------------- */

const sha256Hex = (data) => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

/** Encode each path segment but keep the separators. */
function encodePath(path) {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

/**
 * Build an Authorization header for an R2 (S3-compatible) request.
 * Region is always "auto" for R2.
 */
function signRequest({ method, host, path, payloadHash, extraHeaders = {}, accessKeyId, secretAccessKey }) {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;

  const headers = {
    ...extraHeaders,
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };

  const normalized = Object.entries(headers)
    .map(([key, value]) => [key.toLowerCase(), String(value).trim()])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const canonicalHeaders = normalized.map(([k, v]) => `${k}:${v}\n`).join('');
  const signedHeaders = normalized.map(([k]) => k).join(';');

  const canonicalRequest = [
    method,
    encodePath(path),
    '', // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const signingKey = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return {
    ...headers,
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

/* -------------------------------------------------------------------------- */
/* R2                                                                          */
/* -------------------------------------------------------------------------- */

function createClient() {
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const bucket = process.env.R2_BUCKET || 'safewebtool-models';
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
  const host = `${accountId}.r2.cloudflarestorage.com`;

  const request = async (method, key, body, extraHeaders = {}) => {
    const path = `/${bucket}/${key}`;
    const payloadHash = body ? sha256Hex(body) : sha256Hex('');
    const headers = signRequest({
      method,
      host,
      path,
      payloadHash,
      extraHeaders: body
        ? { ...extraHeaders, 'content-length': String(body.length) }
        : extraHeaders,
      accessKeyId,
      secretAccessKey,
    });
    return fetch(`https://${host}${encodePath(path)}`, { method, headers, body });
  };

  return {
    bucket,
    /** Size of an existing object, or null when absent. */
    async head(key) {
      const response = await request('HEAD', key);
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`HEAD ${key} failed: ${response.status} ${response.statusText}`);
      }
      return Number(response.headers.get('content-length'));
    },
    async put(key, body, contentType) {
      const response = await request('PUT', key, body, {
        'content-type': contentType,
        'cache-control': CACHE_CONTROL,
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`PUT ${key} failed: ${response.status} ${response.statusText}\n${detail.slice(0, 500)}`);
      }
    },
  };
}

/* -------------------------------------------------------------------------- */
/* sync                                                                        */
/* -------------------------------------------------------------------------- */

const contentTypeFor = (file) => CONTENT_TYPES[file.split('.').pop()] || 'application/octet-stream';
const formatMB = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;

async function downloadFromHub(repo, revision, file) {
  const url = `${HF_HOST}${repo}/resolve/${revision}/${file}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Hub download failed (${response.status}) for ${file}\n  ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function syncModel(client, key, { dryRun, force }) {
  const { repo, revision, files } = getModel(key);
  console.log(`\n${key}  (${repo} @ ${revision.slice(0, 8)})`);

  let uploaded = 0;
  let skipped = 0;
  let bytes = 0;

  for (const file of files) {
    const objectKey = `${repo}/resolve/${revision}/${file}`;

    if (!force) {
      const existing = await client.head(objectKey);
      if (existing !== null) {
        console.log(`  skip    ${file}  (${formatMB(existing)} already present)`);
        skipped += 1;
        continue;
      }
    }

    if (dryRun) {
      console.log(`  would upload  ${file}`);
      uploaded += 1;
      continue;
    }

    process.stdout.write(`  fetch   ${file} ... `);
    const body = await downloadFromHub(repo, revision, file);
    process.stdout.write(`${formatMB(body.length)} -> R2 ... `);
    await client.put(objectKey, body, contentTypeFor(file));
    console.log('done');

    uploaded += 1;
    bytes += body.length;
  }

  console.log(`  ${uploaded} uploaded, ${skipped} already present, ${formatMB(bytes)} transferred`);
  return { uploaded, skipped, bytes };
}

/** Mirror plain-URL assets that are not Hugging Face repos. */
async function syncStaticAssets(client, { dryRun, force }) {
  const names = Object.keys(STATIC_ASSETS);
  if (!names.length) return 0;

  console.log('\nstatic assets');
  let bytes = 0;

  for (const name of names) {
    const { source, key } = STATIC_ASSETS[name];

    if (!force) {
      const existing = await client.head(key);
      if (existing !== null) {
        console.log(`  skip    ${name}  (${formatMB(existing)} already present)`);
        continue;
      }
    }
    if (dryRun) {
      console.log(`  would upload  ${name}`);
      continue;
    }

    process.stdout.write(`  fetch   ${name} ... `);
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Download failed (${response.status}) for ${source}`);
    const body = Buffer.from(await response.arrayBuffer());
    await client.put(key, body, contentTypeFor(key));
    console.log(`${formatMB(body.length)} -> R2 ... done`);
    bytes += body.length;
  }

  return bytes;
}

async function main() {
  loadDotEnv();

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const requested = args.filter((arg) => !arg.startsWith('--'));

  const keys = requested.length ? requested : MIRRORED_MODEL_KEYS;
  for (const key of keys) {
    const model = getModel(key); // validate before touching the network
    if (!model.mirrored) {
      console.error(`\n"${key}" is not marked mirrored in ml-models.js — nothing to sync.`);
      console.error('Set mirrored: true and list its files first.\n');
      process.exit(1);
    }
  }

  const client = createClient();
  console.log(`Bucket: ${client.bucket}${dryRun ? '  (dry run)' : ''}`);

  let totalBytes = 0;
  for (const key of keys) {
    const { bytes } = await syncModel(client, key, { dryRun, force });
    totalBytes += bytes;
  }

  // Non-Hub assets (e.g. the MediaPipe face model) ride along on a full sync.
  if (!requested.length) {
    totalBytes += await syncStaticAssets(client, { dryRun, force });
  }

  console.log(`\nTotal transferred: ${formatMB(totalBytes)}`);
  if (!dryRun) {
    console.log(`Public host: ${process.env.R2_PUBLIC_HOST || '(R2_PUBLIC_HOST not set)'}`);
  }
}

main().catch((error) => {
  console.error(`\nSync failed: ${error.message}`);
  process.exit(1);
});
