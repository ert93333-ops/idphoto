# ID PHOTO

Static, Korean-first browser ID photo editor operated by VSHOP. English: `en/`.

Serve this directory over HTTP (for example `python3 -m http.server 8000`) and open the root page. No build or install step. Deploy the repository root with GitHub Pages at https://ert93333-ops.github.io/idphoto/.

All image processing uses browser canvas and MediaPipe Tasks Vision 0.10.32. Code/WASM loads from jsDelivr; selfie multiclass and face detector models load from Google's MediaPipe model storage. These requests require internet access; photo bytes never leave the browser. No analytics, ad scripts, upload endpoints, or persistent photo storage are included.

Shared presets and sources: `assets/specs.js`. Each language has static HTML guides and policies. Automatic head framing uses a face bounding box approximation, not anatomical measurement. Users must check crown/chin placement. Segmentation and retouching can cause rejection; official rules take precedence. Digital JPG dimensions are 300 dpi print equivalents. Korean passport photo exports use the recommended online size of 413×531 px and are capped at 500,000 bytes including the JFIF marker (accepted dimensions: 395–431 × 507–550 px). Print sheets are not subject to the online photo file cap. Print sheets are exactly 4×6 inches (1200×1800 px), approximately 10×15 cm. Exports include a 300 dpi JFIF marker and omit original metadata.

## Manual browser verification

1. Open both `/` and `/en/` over HTTP. Pick a one-person portrait; wait for model loading. Confirm the photo is not included in any network request.
2. Check hair edges on white, gray and blue backgrounds using a non-white-locked preset. Disable background replacement to compare with the original.
3. Change presets and adjust zoom, horizontal/vertical position, brightness, contrast and retouch. Reset should restore the preset defaults. Check no-face and multiple-face notices.
4. Download the photo and print sheet. Verify the photo dimensions against the preset, sheet dimensions of 1200×1800, JFIF density of 300 dpi, and cut marks outside each photo.
5. Block the model CDN, select a photo, and check the error and disabled downloads. Restore connectivity and select the photo again to retry.
6. Check narrow screens and keyboard navigation. Follow the language switch and guide links from nested pages when served under `/idphoto/`.


Official submission presets (Korean passport, Korean ID card, driving licence, US passport and Chinese visa) default to background replacement OFF, retouch 0 and lighting off. Photograph against a real white wall; use crop, size and print only and follow each authority’s editing rules. Other presets enable optional lighting match by default. Background replacement, retouch and lighting match are intended for résumés, portraits and general use.

`assets/quality.js` refines the segmentation alpha with joint bilateral luminance guidance, estimates the old background with a mask-weighted local blur, decontaminates edge colours and composites onto the chosen background. Lighting match uses skin-region colour statistics with per-channel gain capped at ±6% and 2.5% peak rim brightening. After rendering, `window.__idphoto.lastStats` reports output dimensions, background colour, the mean RGB of the ring 6 output pixels outside the alpha edge, each 6×6 corner patch, and `whiteBackgroundPass` (all channels >=250). An absent ring reports null and does not pass; background replacement OFF reports disabled statistics. These diagnostics assess pixels, not official acceptance.

Run `node --test assets/framing.test.mjs tests/*.mjs` for framing, image quality, preset policy and export checks. Real portrait/model checks still require a browser with CDN access.
