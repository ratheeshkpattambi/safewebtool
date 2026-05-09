# Passport Photo Maker Research

## Recommendation

Build `image/passport-photo` as a free, private, browser-local passport, visa, and ID photo maker.

This is a strong SafeWebTool fit because the user pain is obvious: paid services charge for a workflow that can be mostly local image sizing, guided cropping, JPEG export, and print-sheet layout. Passport Photo Online shows a $22.95 digital photo option, Visafoto lists a £7 one-time photo editing fee, OnlinePassportPhoto lists $9.95 for digital-only, PassportPix charges $9.99, and PassportPhotoFactory advertises $6.99 digital downloads.

The privacy angle is unusually strong. Users are handling face photos intended for identity documents, and many paid/AI tools ask them to upload those photos. SafeWebTool should make the product promise simple: "Your photo stays in this browser."

## Product Positioning

Primary user job:

- "I need a correctly sized passport/visa/ID photo file or print sheet without uploading my face photo or paying a hidden fee."

MVP promise:

- Local upload/camera capture.
- Manual crop with official-size presets.
- Face/head guide overlay.
- Exact pixel exports.
- JPEG compression for digital upload limits.
- 4x6 and Letter/A4 print sheets.
- No signup, no watermark, no server upload.

Avoid promising government acceptance. Official requirements vary and often include subjective checks like shadows, expression, clothing, and whether the original photo has been altered.

## Compliance Constraints

The tool must be conservative. The U.S. Department of State says passport photos are 2 x 2 inches and gives head-size requirements. It also warns users not to alter photos using software, phone apps, filters, or AI. U.S. visa digital image rules specify square images, 600 x 600 minimum, 1200 x 1200 maximum, JPEG format, sRGB color, and <= 240 KB file size.

The UK passport service similarly says digital photos must be unedited, with no effects or filters. Canada passport rules are stricter for many passport applications: printed photos must be 50 mm x 70 mm, have a chin-to-crown measurement between 31 mm and 36 mm, and must not be altered with photo-editing software, filters, or AI tools. Canada also requires commercial-photographer handling for many passport submissions.

Product implication:

- Cropping, resizing, print layout, and file-size compression are acceptable as formatting tools.
- Do not do beautification, face reshaping, lighting enhancement, red-eye correction, or AI retouching.
- Background replacement/removal should not be in MVP by default. If added later, it must be clearly marked as an optional tool that may make photos invalid for some authorities.
- Use face detection as an advisory guide only. It should help position the crop and warn about likely problems, not silently edit the image.

## Browser Technology Needed

### Core MVP

No ML dependency is required for MVP.

- `File` / `Blob` APIs for local image intake.
- `createImageBitmap()` or `HTMLImageElement` for decoding.
- Canvas 2D for crop, resize, background matte preview, and print-sheet composition.
- `HTMLCanvasElement.toBlob(type, quality)` for PNG/JPEG export and iterative JPEG compression.
- `URL.createObjectURL()` for local preview/download links.
- `<input type="file" accept="image/*" capture="environment">` or camera capture option for mobile.

Canvas note:

- Browser canvas exports are reliable for pixel dimensions. MDN notes `toBlob()` produces PNG by default and supports formats such as JPEG and WebP with a quality argument, but created files have 96 DPI metadata where supported. For passport printing, we should make the print sheet the correct pixel size for the intended paper at 300 DPI, then instruct users to print at actual size / 4x6. If we need embedded 300 DPI metadata, add a small JPEG metadata writer later.

### Face Detection

Recommended MVP-plus choice:

- MediaPipe Tasks Vision Face Detector for Web.

Why:

- Official Google AI Edge documentation.
- Runs in browser JavaScript.
- Designed for single images and video.
- Returns face bounding boxes plus key points: left eye, right eye, nose tip, mouth, and ear tragion points. That is enough for auto-centering suggestions and guide overlays.

Alternative:

- TensorFlow.js face detection / face landmarks models.

Why not first:

- More dependency surface for a simple cropping tool.
- Landmarks are useful for deeper validation, but MVP only needs approximate face/head placement.

Avoid for production:

- Native `FaceDetector` / Shape Detection API.

Why:

- The WICG spec is not a stable web standard, and Chrome documentation says face detection is still behind a flag while barcode detection is the part available by default. It is useful only as progressive enhancement after a defensive feature check.

Heavy future option:

- ONNX Runtime Web with WASM/WebGPU for custom face/segmentation models.

Why not first:

- More model and bundle complexity.
- ONNX WebGPU support is strongest in Chromium, while Safari/iOS support is limited compared with WASM/WebGL. SafeWebTool needs broad mobile support.

### Background Segmentation

Optional later, not MVP default:

- MediaPipe Image Segmenter can run in web apps and segment image regions for effects such as background changes.

Why defer:

- Official passport/visa sources often say photos must be unedited or not AI-altered.
- Automatic background replacement is a compliance risk and a product trust risk.

Safer MVP:

- Show a neutral background guide.
- Let users crop against their original background.
- Provide a checklist warning if background is not plain/light.

## Preset Data For MVP

Start with high-demand, low-complexity presets:

- United States passport print: 2 x 2 in, 51 x 51 mm, 600 x 600 px at 300 DPI.
- United States visa digital: square JPEG, 600 x 600 px default, <= 240 KB target.
- Generic 35 x 45 mm: 413 x 531 px at 300 DPI.
- Canada 50 x 70 mm: 591 x 827 px at 300 DPI, with a strong Canada-specific warning.
- Custom: width, height, units, DPI.

Print sheets:

- 4 x 6 in at 300 DPI: 1200 x 1800 px.
- Letter at 300 DPI: 2550 x 3300 px.
- A4 at 300 DPI: 2480 x 3508 px.

## UX Design

The first screen should be the actual tool, not a marketing page.

Layout:

- Left/top: upload/camera and preview.
- Right/bottom: preset, guide status, export options.
- On mobile: stepper flow: Pick preset -> Add photo -> Align crop -> Download.

Controls:

- Preset select/search.
- Zoom slider.
- Rotate buttons.
- Drag crop area.
- Toggle guide overlay.
- Export buttons for digital file and print sheet.

Trust language:

- "Local only: no upload."
- "Guides do not guarantee acceptance."
- "Do not use retouching or AI edits for strict passport applications."

## Architecture Plan

Files:

- `src/image/passport-photo.js`
- metadata entry in `src/common/metadata.js`
- optional shared helper later: `src/common/image-export-utils.js`
- focused tests: `tests/passport-photo-maker.spec.js`

Implementation phases:

1. Manual MVP: presets, local upload, crop/zoom/rotate, guide overlay, digital export, print sheet.
2. Compression: iterative JPEG export for file-size limits.
3. Advisory face detection: MediaPipe optional dynamic import; graceful fallback to manual mode.
4. Optional compliance checks: dimensions, aspect ratio, file size, face placement guide, multiple-face warning.
5. Optional background tooling only with warnings and disabled-by-default behavior.

## Pre-Implementation Acceptance Tests

The pre-implementation tests are intentionally skipped until the tool exists. They encode the expected behavior before implementation starts:

- Route loads as `image/passport-photo`.
- Page communicates local-only privacy.
- US passport preset starts at 600 x 600 px.
- US visa digital export can target <= 240 KB JPEG.
- 4x6 print sheet export uses 1200 x 1800 px.
- Guide overlay appears before any AI/manual detection dependency is required.
- Tool does not offer default AI retouching/background replacement.
- Download filenames are predictable.
- Mobile flow keeps upload, preset, crop, and export usable.

## Source Notes

- U.S. passport photo requirements: https://travel.state.gov/content/travel/en/passports/how-apply/photos.html
- U.S. visa digital image requirements: https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos/digital-image-requirements.html
- UK digital passport photo rules: https://www.passport.service.gov.uk/help/photo-rules
- Canada passport photo requirements: https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/photos.html
- MediaPipe Face Detector for Web: https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector/web_js
- MediaPipe Image Segmenter for Web: https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter/web_js
- TensorFlow.js models: https://www.tensorflow.org/js/models
- Shape Detection API status: https://developer.chrome.com/docs/capabilities/shape-detection
- Shape Detection API draft: https://wicg.github.io/shape-detection-api/
- ONNX Runtime Web browser support: https://onnxruntime.ai/docs/get-started/with-javascript/web.html
- ONNX Runtime WebGPU: https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html
- Canvas `toBlob()`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
- Visafoto pricing: https://visafoto.com/visafoto-prices
- OnlinePassportPhoto pricing: https://onlinepassportphoto.com/Passport-photo-prices.html
- PassportPix: https://www.passport-pix.com/
- PassportPhotoFactory: https://passportphotofactory.com/
