import { getX264EncodeArgs } from './ffmpeg-utils.js';

function buildAudioFilter(delaySeconds, { pad = false } = {}) {
  const filters = [];
  const delayMs = Math.max(0, Math.round(Number(delaySeconds || 0) * 1000));
  if (delayMs > 0) filters.push(`adelay=${delayMs}:all=1`);
  if (pad) filters.push('apad');
  return filters.length ? `[1:a:0]${filters.join(',')}[aout]` : '';
}

function mapAudioArgs(delaySeconds, lengthMode) {
  const needsPad = lengthMode === 'match';
  const filter = buildAudioFilter(delaySeconds, { pad: needsPad });
  return filter
    ? ['-filter_complex', filter, '-map', '[aout]']
    : ['-map', '1:a:0'];
}

export function buildVideoAudioCommand({
  mode,
  lengthMode,
  delaySeconds = 0,
  videoInputName,
  audioInputName,
  outputFileName,
  copyVideo = true
}) {
  const outputArgs = copyVideo
    ? ['-c:v', 'copy']
    : getX264EncodeArgs({ quality: 'medium', bitrateKbps: 1800, audio: false, faststart: true }).filter(arg => arg !== '-an');

  if (mode === 'remove') {
    return [
      '-i', videoInputName,
      '-map', '0:v:0',
      ...outputArgs,
      '-an',
      ...(copyVideo ? ['-movflags', '+faststart'] : []),
      '-y', outputFileName
    ];
  }

  const args = [];
  args.push('-i', videoInputName);
  if (lengthMode === 'loop') args.push('-stream_loop', '-1');
  args.push('-i', audioInputName);
  args.push('-map', '0:v:0');
  args.push(...mapAudioArgs(delaySeconds, lengthMode));
  args.push(...outputArgs);
  args.push('-c:a', 'aac', '-b:a', '128k');
  if (lengthMode !== 'keep') args.push('-shortest');
  if (copyVideo) args.push('-movflags', '+faststart');
  args.push('-y', outputFileName);
  return args;
}
