Build a static site (no build step, plain HTML/CSS/JS, deployable to GitHub Pages at https://ert93333-ops.github.io/idphoto/ — use relative links) : free ID photo maker. Korean-first (root /), English under /en/.
Core tool (index.html + /en/index.html, shared /assets/app.js):
- User picks photo; ALL processing in browser, never uploaded (state plainly).
- Background removal with MediaPipe Selfie Segmentation / @mediapipe/tasks-vision ImageSegmenter loaded from jsDelivr CDN (selfie_multiclass or selfie_segmenter model from storage.googleapis.com/mediapipe-models). Soft matting: feather/blur the mask, color decontamination at edges (pull edge pixels toward foreground color, remove background color spill), composite onto white (or light gray/blue option) with subtle lighting match.
- Face detection (MediaPipe FaceDetector) to auto-position crop so head height fits spec; manual zoom/offset sliders.
- Brightness/contrast slider.
- Natural retouch slider 0-100: skin smoothing (edge-preserving bilateral-ish blur limited to skin mask) and small blemish reduction only; NEVER alter facial geometry/features. Passport presets default 15 (light); show note: heavy retouching may cause rejection (cite https://www.passport.go.kr and https://travel.state.gov/content/travel/en/passports/how-apply/photos.html — photos must not be digitally altered/ retouched to change appearance).
- Outputs: digital JPG download at spec pixel size (300dpi), and 4x6 inch (10x15cm) print sheet tiled with cut margins, 300dpi JPG.
- Presets (assets/specs.js with source URL per spec): KR passport 35x45mm head(chin to crown) 32-36mm, white bg, source https://www.passport.go.kr ; KR 주민등록증 35x45 (source https://www.gov.kr); KR 운전면허 35x45 (source https://www.safedriving.or.kr); 반명함 30x40; 이력서 30x40 (note: common convention, no official spec); US passport/visa 2x2in head 1-1 3/8in (25-35mm) white bg source travel.state.gov; Japan passport 35x45; China visa 33x48; Schengen visa 35x45 head 32-36mm. Mark non-official ones as "관례".
Pages (ko + en): per-spec landing pages (/kr-passport/, /id-card/, /driver-license/, /half-business/, /resume/, /us-passport/ ...) each with a short factual answer block, spec table, source citation link, tool link; FAQ page with FAQPage JSON-LD; HowTo JSON-LD on tool page; privacy (no upload, may use Google AdSense cookies in future), terms, about (operated by VSHOP), contact (email ert93333@gmail.com).
- llms.txt, sitemap.xml, robots.txt, Open Graph + canonical + hreflang on every page.
- AdSense-ready placeholder div class="ad-slot" with comment only, NO ad script.
- No income claims, no fake reviews, no invented facts. Clean mobile-friendly design.
Then write tests/smoke.mjs? Not needed. Commit locally.
