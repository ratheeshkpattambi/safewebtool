/**
 * Long-form article content for tool pages: accurate, per-tool prose plus FAQ.
 *
 * Deliberately NOT in metadata.js. That file is already ~52KB and lands in the eager
 * `common` chunk on every page load; this content is only ever needed on a single tool
 * page. Keeping it separate means the split described in documentation/known-issues.md
 * can move both files' page-specific halves behind a lazy import together.
 *
 * Rules for anything added here:
 * - It must be TRUE of this tool's actual implementation. Every claim below was written
 *   against the source (real quality defaults, real format lists, real encoder
 *   behaviour). Wrong specifics are worse than no content.
 * - It must be genuinely useful to a reader. Templated prose with the tool name swapped
 *   in is "scaled content abuse" under Google's spam policy and risks a manual action.
 * - Do NOT add FAQPage or HowTo structured data for it. Google restricted FAQ rich
 *   results to government/health sites in 2023 and deprecated them entirely on
 *   2026-05-07; HowTo rich results died in 2023. The visible text still earns its place
 *   for query matching and for AI answer engines. The markup does not.
 *
 * Coverage is partial and that is fine — renderToolArticle() renders nothing for a tool
 * with no entry here.
 */
export const TOOL_ARTICLES = {
  'image/compressor': {
    article: [
      { heading: 'What compression actually does to your image',
        body: [
          'This tool re-encodes your image at a lower quality setting rather than resizing it. The quality slider runs from 0.1 to 1.0 and starts at 0.6, which is usually the point where file size drops sharply but visible artefacts have not appeared yet on photographs.',
          'Compression here is lossy and one-way. Each pass discards detail permanently, so compressing an already-compressed JPEG a second time degrades it further rather than recovering anything. Always compress from your original file, not from a previous export.',
          'Images larger than roughly 200KB are converted to JPEG automatically, because JPEG beats PNG substantially on photographic content. If you need a lossless result or transparency, pick PNG or WebP explicitly instead of leaving the format on auto.'
        ] },
      { heading: 'Choosing a quality setting',
        body: [
          'For photographs headed to a website, 0.6 to 0.8 is the useful range. Below 0.5 you will start to see blocking around high-contrast edges and banding in skies and gradients.',
          'Screenshots, line art, and anything containing text behave differently. JPEG compression smears text edges badly, so for those choose PNG or WebP and accept the larger file, or keep quality above 0.85.'
        ] },
      { heading: 'Why this runs in your browser',
        body: [
          'Compression happens on your own machine using the browser Canvas API. The image is never uploaded, which matters if the photo contains a face, a document, a screenshot of private information, or location metadata.',
          'A practical consequence: very large images are limited by your device memory rather than by an upload cap. On a phone, extremely large source files may fail where a desktop browser would succeed.'
        ] }
    ],
    faq: [
      { q: 'Does compressing remove EXIF and location data?', a: 'There is a preserve-EXIF option. When it is off, the re-encode drops the metadata block, including GPS coordinates and camera details. Turn it off if you are sharing a photo publicly and do not want to disclose where it was taken.' },
      { q: 'Can I get the original quality back afterwards?', a: 'No. Lossy compression discards image data permanently. Keep your original file if you may need a higher-quality version later.' },
      { q: 'Is there a file size limit?', a: 'There is no server-side limit because nothing is uploaded. The practical ceiling is your device memory and the browser tab, which is generally generous on desktop and tighter on mobile.' }
    ]
  },

  'image/convert': {
    article: [
      { heading: 'Which format to convert to',
        body: [
          'This tool outputs JPG, PNG, or WebP. JPG is the right default for photographs and produces the smallest files, but it cannot store transparency and it is lossy. PNG is lossless and supports transparency, which makes it correct for logos, icons, screenshots, and anything with sharp edges or text, at the cost of a much larger file.',
          'WebP is usually the best of both for the web: noticeably smaller than JPG at comparable quality, with transparency support. Every current browser reads it. Its main drawback is that some older desktop software and a few printing workflows still will not open it.'
        ] },
      { heading: 'Quality and what it applies to',
        body: [
          'The quality slider runs from 0.1 to 1.0 and defaults to 0.9. It only affects lossy output — JPG and WebP. Converting to PNG ignores it entirely, because PNG encodes losslessly, which is also why converting a photo to PNG often produces a file larger than the original.',
          'Converting between lossy formats compounds loss. Going JPG to WebP re-encodes already-degraded data, so start from the highest-quality source you have rather than from an export.'
        ] },
      { heading: 'Transparency, and where it goes',
        body: [
          'Converting a transparent PNG or WebP to JPG discards the alpha channel, because JPG has no way to represent it. Transparent regions become solid, which is usually not what you want for a logo. Convert to WebP instead if you need both a smaller file and transparency.'
        ] }
    ],
    faq: [
      { q: 'Can I convert HEIC photos from my iPhone?', a: 'Only if your browser can decode HEIC, which Safari on Apple devices generally can and most desktop browsers cannot. Where it is unsupported the file will not load. Exporting as JPEG from the Photos app first is the reliable route.' },
      { q: 'Why did my PNG get bigger after converting?', a: 'PNG is lossless, so a photograph re-encoded as PNG stores every pixel exactly and typically grows several times larger than the JPG it came from. That is expected. Use PNG for graphics and text, not photos.' },
      { q: 'Does converting change the image dimensions?', a: 'No. Conversion changes only the encoding. Pixel dimensions are preserved — use the resize tool if you need to change them.' }
    ]
  },

  'image/resize': {
    article: [
      { heading: 'How the resize is performed',
        body: [
          'The image is drawn into an HTML canvas at the target dimensions and re-encoded at quality 0.92, keeping the original file type. That means a JPEG in produces a JPEG out and a PNG stays lossless.',
          'Downscaling is safe and generally looks good. Upscaling cannot invent detail that is not in the source — enlarging a small image produces a soft, blurry result, and no browser-side tool changes that.'
        ] },
      { heading: 'Aspect ratio and distortion',
        body: [
          'Keeping the aspect ratio locked is almost always what you want. Setting width and height independently stretches the image, which is immediately obvious on faces and on anything containing straight lines or text.',
          'If you need exact dimensions that do not match the source ratio, resize to the nearest matching size and then crop, rather than distorting.'
        ] }
    ],
    faq: [
      { q: 'Will resizing reduce the file size?', a: 'Usually yes, and substantially — halving both dimensions removes about three quarters of the pixels. If you want a smaller file at the same dimensions, use the compressor instead.' },
      { q: 'Does resizing lose quality?', a: 'Downscaling discards pixels by definition, but the result normally looks clean. For JPEG sources the re-encode adds a small additional loss; for PNG the output stays lossless.' }
    ]
  },

  'video/gif': {
    article: [
      { heading: 'Why GIF files get so large',
        body: [
          'GIF stores every frame as a separate paletted image with no motion compression, so file size scales almost linearly with frame count and dimensions. A few seconds of full-size video can easily exceed 20MB as a GIF.',
          'The two settings that actually control size are frame rate and dimensions. Frame rate here ranges from 5 to 30fps and defaults to 12, which reads as smooth for most screen recordings and reaction clips. Dropping from 24 to 12fps roughly halves the file.'
        ] },
      { heading: 'How the colours are chosen',
        body: [
          'Conversion runs a two-pass palette process: the first pass analyses the clip and builds an optimal colour table, the second maps frames onto it with dithering. This is why output looks considerably better than a naive conversion at the same size.',
          'GIF is limited to 256 colours per frame, and the lower quality preset narrows that to 64. Flat graphics and screen recordings survive this well. Gradients, skies, and film footage show visible banding — that is the format, not the encoder.'
        ] }
    ],
    faq: [
      { q: 'Why does my GIF have no sound?', a: 'The GIF format cannot store audio at all. If you need sound, keep the clip as MP4 or WebM.' },
      { q: 'How do I make the GIF smaller?', a: 'Reduce dimensions first, then frame rate, then the quality preset. Trimming the clip shorter helps most of all, since size scales with frame count.' },
      { q: 'Why does conversion take so long?', a: 'Encoding runs entirely in your browser through WebAssembly, which is slower than a native application, and the palette process reads the clip twice. Longer or larger clips take proportionally longer.' }
    ]
  },

  'video/reverse': {
    article: [
      { heading: 'What reversing actually requires',
        body: [
          'Playing a video backwards cannot be streamed. The encoder has to decode the segment, hold the frames, and re-encode them in reverse order, which is why this is slower and more memory-hungry than trimming or re-encoding the same clip.',
          'Because the whole selected range is held during processing, clip length is the setting that matters most. Selecting a few seconds with the range slider is dramatically faster than reversing a long video, and much less likely to exhaust memory on a phone.'
        ] },
      { heading: 'Audio, and why removing it is the default',
        body: [
          'Reversed audio is rarely useful and roughly doubles the work, so the remove-audio option is enabled by default. Leaving it on produces a faster export and a smaller file.',
          'Turn it off only when the reversed sound is the point — the effect is distinctive and deliberate, not something you want by accident.'
        ] }
    ],
    faq: [
      { q: 'Is there a length limit?', a: 'No hard limit, but reversing holds decoded frames in memory, so long or high-resolution clips can fail on constrained devices. Select a shorter range with the slider if processing stalls.' },
      { q: 'Does the video get re-encoded?', a: 'Yes, necessarily. Frame order cannot be changed without decoding and re-encoding, so expect a small generational quality loss.' }
    ]
  },

  'video/mp4': {
    article: [
      { heading: 'What converting to MP4 buys you',
        body: [
          'MP4 with H.264 video is the most broadly compatible video format there is — it plays on essentially every phone, browser, TV, and editing application without extra codecs. Converting to it is usually about compatibility rather than quality or size.',
          'Output is written with the metadata index at the front of the file, so it starts playing before it has fully downloaded rather than requiring the whole file first. That matters if you are uploading the result somewhere it will be streamed.'
        ] },
      { heading: 'Choosing a resolution',
        body: [
          'Keep source is the right default when you only need format compatibility. Downscaling to 1080p or 720p is what actually reduces file size meaningfully, and for footage that will be watched on a phone, 720p is often indistinguishable from 1080p at a fraction of the size.',
          'Upscaling a low-resolution source to 4K only makes the file larger. The detail is not there to recover.'
        ] }
    ],
    faq: [
      { q: 'Why is conversion slow compared to a desktop app?', a: 'Encoding runs in your browser through WebAssembly on a single thread, which is inherently slower than a native multi-threaded encoder. The trade is that your video is never uploaded anywhere.' },
      { q: 'Will converting improve quality?', a: 'No. Re-encoding can only preserve or lose detail, never add it. Convert for compatibility or smaller size, not to improve a low-quality source.' }
    ]
  },

  'text/json-formatter': {
    article: [
      { heading: 'Formatting, validating, and minifying',
        body: [
          'Formatting re-indents JSON so structure is readable, which is the fastest way to find a misplaced bracket in a long API response. Minifying strips whitespace for the opposite reason — smaller payloads over the wire.',
          'Both operations parse the document first, so invalid JSON is reported rather than silently mangled. The parse error points at where the document stopped being valid, which is usually just after the real mistake.'
        ] },
      { heading: 'Mistakes that make JSON invalid',
        body: [
          'The common ones are a trailing comma after the last item, single quotes instead of double quotes around keys or strings, unquoted keys, and comments. All four are legal in JavaScript object literals and none are legal in JSON, which is why hand-edited config files break so often.'
        ] }
    ],
    faq: [
      { q: 'Is my data sent anywhere?', a: 'No. Parsing and formatting happen in your browser. This matters because JSON pasted for debugging routinely contains API keys, tokens, and personal records.' },
      { q: 'Does formatting change my data?', a: 'No. Only whitespace changes. Keys, values, types, and ordering are preserved exactly.' }
    ]
  },

  'ml/transcribe': {
    article: [
      { heading: 'Speech recognition that runs on your device',
        body: [
          'Transcription uses a Whisper speech-recognition model that downloads to your browser and runs locally. The audio never leaves your machine, which is the entire point for recordings of meetings, interviews, medical appointments, or anything else you would not upload to a third party.',
          'The first run downloads model weights, which takes time and bandwidth depending on the size you pick. After that the model is cached and subsequent transcriptions start immediately.'
        ] },
      { heading: 'Choosing a model size',
        body: [
          'Smaller models start faster and use less memory; larger ones are more accurate, particularly on accented speech, background noise, and technical vocabulary. Tiny is a reasonable starting point for clear single-speaker audio; step up if the transcript has errors.',
          'English-only variants are more accurate than multilingual ones at the same size when the audio is definitely English. Use a multilingual model when the language is not English or when you want to translate speech into English.'
        ] }
    ],
    faq: [
      { q: 'Is my audio uploaded for transcription?', a: 'No. The model runs in your browser and the audio stays on your device. Nothing is sent to a transcription service.' },
      { q: 'Why is the first transcription slow?', a: 'The model weights have to download before inference can start. That is a one-time cost per model — later runs reuse the cached copy.' },
      { q: 'Can it transcribe a video file?', a: 'Yes. The audio track is extracted from the video in the browser and transcribed the same way.' }
    ]
  }
};

/** Article + FAQ for a tool path, or null. */
export function getToolArticle(toolPath) {
  return TOOL_ARTICLES[toolPath] || null;
}

/**
 * Long-form article content for a tool page: the "what this actually does" prose,
 * plus its FAQ.
 *
 * Rendered into BOTH the live tool page (below the tool UI) and the prerendered
 * crawler body, from this one function. That is deliberate and not optional — the
 * client router replaces <main> on first render, so content that existed only in the
 * prerendered HTML would be served to Googlebot and never to a human. That is
 * cloaking, and it is a manual-action risk, not a clever trick.
 *
 * Tools without an `article` entry render nothing here, so this degrades cleanly
 * while coverage is filled in.
 */
export function renderToolArticle(tool) {
  if (!tool) return '';

  const extra = getToolArticle(`${tool.category}/${tool.id}`) || {};
  const sections = (extra.article || [])
    .map(({ heading, body = [] }) => `
      <section class="mt-6">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">${heading}</h2>
        ${body.map(par => `<p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">${par}</p>`).join('')}
      </section>`)
    .join('');

  const steps = Array.isArray(tool.howToUse) && tool.howToUse.length
    ? `
      <section class="mt-6">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">How to use ${tool.name}</h2>
        <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          ${tool.howToUse.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </section>`
    : '';

  const faqItems = extra.faq || tool.faq;
  const faq = Array.isArray(faqItems) && faqItems.length
    ? `
      <section class="mt-6">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">Questions</h2>
        <dl class="mt-2 space-y-3">
          ${faqItems.map(({ q, a }) => `
            <div>
              <dt class="text-sm font-semibold text-slate-800 dark:text-slate-100">${q}</dt>
              <dd class="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">${a}</dd>
            </div>`).join('')}
        </dl>
      </section>`
    : '';

  if (!sections && !steps && !faq) return '';

  return `
    <div class="border-t border-slate-200 px-4 py-5 dark:border-gray-700 sm:p-6" data-agent-region="tool-article">
      ${steps}${sections}${faq}
    </div>
  `;
}
