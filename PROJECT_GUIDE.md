# PDF Studio — project guide for another model

Read this file before changing anything. It describes what each module does, how the pieces connect, and which behaviors must stay as they are.

Project path: `D:\Project\PDF`

PDF Studio is a browser-only PDF tool. There is no backend and no upload. The user picks a tool, opens a PDF on this device, edits or processes it in the browser, then downloads the result. The maximum file size is 10 MB.

Do not rebuild the app. Do not add a server. Do not change PDF processing unless the user explicitly asks for a processing bugfix, and then change only the broken part.

## How to run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

```bash
npm run build
```

Output is `dist/`. Deploy that folder to Cloudflare Pages with the Vite framework. `public/_headers` and `public/_redirects` are part of the deploy. The content-security policy must keep `wasm-unsafe-eval`, `worker-src`, and `blob:` or qpdf and PDF.js will fail in production.

## Product rules that must not drift

- Files never leave the browser. Do not `fetch` or POST the PDF anywhere.
- Check `File.size` against 10 MB (`10_485_760` bytes) before `arrayBuffer()`. See `src/lib/fileGate.ts` and `src/lib/constants.ts`.
- Do not import Node built-ins (`fs`, `path`, `os`, `crypto`, `stream`) into client code. `vite.config.ts` may use `node:path` because it runs at build time only. `crypto.randomUUID()` in the browser is fine.
- Every `URL.createObjectURL` must be revoked. Use `src/lib/memory.ts`. Clear canvases with `clearCanvas`.
- Do not type directly on a Fabric canvas. The signature pad draws with a mouse or finger. Text uses TipTap (`TextOverlay` or `DocumentEditor`).
- Copy and the 10 MB limit stay visible on the landing page and on the upload step.
- Author credit stays in the footer, not the header. Name: Md Imran. LinkedIn: `https://www.linkedin.com/in/md-imran-qa`. Year in the footer is 2026.
- Strings live in `src/locales/en`, `hi`, and `es`. If you add a key, add it in all three files.
- Tools are not separate URLs. `App.tsx` has one route, `/`. The chosen tool is React state named `job` inside `Home.tsx`.
- `src/pages/Tools.tsx` and `src/pages/Editor.tsx` are old and are not mounted. Do not wire them back in unless the user asks. The live screen is `Home.tsx`.
- Print check is parked. `PRINT_CHECK_ENABLED` in `src/lib/constants.ts` is `false`. Do not turn it on unless the user asks.
- Do not bring back the message “This PDF is already compact…”. Compression must still try to shrink the file.
- Do not optimize for 4K or ultra-wide screens unless the user starts that phase.
- Visual work so far: app shell, landing page, tool pages, then a mobile editor header and workspace (about 320–430px wide). Tablet behavior below 1024px should not be thrown away when editing mobile.

## Screen flow

```text
Landing (no file, no job)
  -> user picks a tool card, footer tool, or PDF Master Edit
Tool page (job set, no file)
  -> breadcrumb Home / Tool, short title, privacy notice, upload dropzone
Editor (file open)
  -> document header, optional tool settings, PDF preview, bottom page/zoom bar
```

`job === null` and no bytes: marketing home (`SiteHeader`, hero, tool grid, featured Master Edit, `SiteFooter`).

`job` set and no bytes: `ToolPageLayout` plus `UploadDropzone`.

Bytes present: editor. `focused` is true when a specific tool job is open (`job` is set and is not `master`). Master Edit shows the tool rail. A single tool hides the rail and shows that tool’s settings.

Closing the file (`hardClear`) wipes editor state and calls `clear()` on the PDF context, which bumps `session` so the upload zone remounts.

While a PDF is opening, compressing, protecting, or applying an edit, a full-screen wait overlay says to wait and not click anything else.

## Architecture

```text
main.tsx
  i18n + index.css + App
    PdfProvider          src/store/PdfContext.tsx   current file bytes
      HashRouter
        Layout           toast + password dialog
          Home           all visible product UI
            components   header, preview, tools
            lib          pdf.js, pdf-lib, qpdf-wasm
```

| Library | Used for |
| --- | --- |
| React 19 + Vite 6 + Tailwind 4 | UI |
| pdfjs-dist | Open, render, read text |
| pdf-lib + fontkit | Write pages, merge, rotate, bake text and images |
| @jspawn/qpdf-wasm | Encrypt and decrypt only |
| Fabric | Signature drawing pad only |
| TipTap | Text boxes and the full-document text editor |

## Boot files

### `src/main.tsx`

Mounts React in `#root` with `StrictMode`. Imports `i18n` first so translations exist before the first render, then `index.css`, then `App`.

### `src/App.tsx`

Wraps the tree in `PdfProvider` and `HashRouter`. The only real route is `/` → `Layout` → `Home`. Any other hash redirects to `/`. Hash routing is used so Cloudflare Pages does not need a server rewrite for each tool.

### `src/i18n.ts`

i18next with English, Hindi, and Spanish. Fallback is English. Language is remembered in `localStorage`, then the browser language. UI text must go through `t("key")`.

### `src/index.css`

Design tokens and a few component classes Tailwind does not express well. Theme is blue on white (`#2563EB` primary, slate text, `#F8FAFC` background). Content width class is `.ui-wrap` (max about 72rem).

Important classes:

- `.doc-header` — editor header grid. Below 1024px: brand and More on row 1, filename on row 2, actions on row 3. At 1024px and up: one row, 3.75rem tall.
- Short landscape (`max-height: 500px` and `min-width: 540px`, still under 1024px): one row again so a sideways phone is not a tall stack.
- `.doc-filename` — wrapping filename. Desktop and that short landscape force one line.
- `.compress-range` — 44px-tall slider, 6px track, 28px thumb. The active color uses the CSS variable `--compress-pct`.
- `.tool-settings` — on narrow screens the settings panel scrolls inside itself (`max-height` about 38%, tighter when the viewport is shorter than 500px) so the preview and bottom bar are not pushed off screen. From 768px up the cap is removed.
- `.ui-btn-primary`, `.ui-btn-secondary`, `.ui-btn-ghost`, `.ui-menu-item`, `.ui-chip`, `.ui-field`, `.ui-panel`.

Known gap: `Home.tsx` renders the More menu with the class `more-sheet`, but `.more-sheet` is not in this CSS file yet. The menu is portaled to `document.body`. On a small screen it needs `position: fixed; left: 0; right: 0; bottom: 0` plus a top radius and safe-area padding. From 768px up it should be a 14rem dropdown placed with the inline `top` / `right` style. Do not fix that by putting `overflow-x: hidden` on the page.

The header uses `backdrop-filter`. A `position: fixed` menu inside that header would stick to the header instead of the viewport. That is why the More menu and the Private note are rendered with `createPortal(..., document.body)`.

## State: `src/store/PdfContext.tsx`

This is the only global store. `usePdf()` throws if it is used outside `PdfProvider`.

What it holds:

- `bytes` — the PDF currently shown. After a password unlock this is the decrypted copy, not the locked original.
- `name`, `pageCount`, `page`
- `busy` — true while a file is being opened
- `passwordOpen`, `pendingFile` — encrypted file waiting for a password
- `extraMergeBytes` — extra PDFs chosen for merge, not yet merged
- `toasts`, `activity`, `session`
- actions: `openFiles`, `submitPassword`, `cancelPassword`, `setBytes`, `setPage`, `clear`, `addMergeFile`, `clearMerge`, `showToast`, `log`

How open works (`openOne`):

1. Reject non-PDFs.
2. `readPdfBytes` checks 10 MB, then reads the file.
3. If a password was submitted, `decryptPdf` runs first. Only the unlocked bytes are stored. A wrong password shows an error and leaves the dialog open.
4. If no password was given, PDF.js opens the file. A password error stores `pendingFile` and opens the dialog. It does not keep the encrypted bytes as the preview.
5. `ingest` asks PDF.js for the page count, destroys that temporary document, then saves bytes and name. `setBytes` keeps the current page when a tool replaces the file. A new open jumps to page 1.

`clear` drops bytes, merge files, toasts, and activity, revokes object URLs, and increments `session`.

Toasts disappear after about 5.2 seconds. The activity log keeps 8 lines. `Home` also has its own `working` flag for compress, protect, and apply. Either `busy` or `working` shows the wait overlay.

## Live page: `src/pages/Home.tsx`

This file is the product. It is large because every tool’s panel lives here on purpose. Do not split it into new routes.

### Jobs

`JobId` is `compress | sign | rotate | merge | protect | hide | pages | bw | text | master`.

The landing grid and the footer call `setJob`. Master Edit is the full editor with the rail. Other jobs open that tool’s panel after upload and hide the rail (`focused`).

### Upload original vs current preview

`uploadBytesRef` and `uploadSize` store the first bytes after a new file, once. Compress and black-and-white always start from that original, not from the last preview. Later `setBytes` calls must not overwrite the ref. `clear` / a missing `bytes` resets it.

Repeated compress must not grow the file. Each run reads `uploadBytesRef`. The preview is replaced only when the new bytes are smaller than that source.

### Editor state that is not in PdfContext

- `overlays` — text, cover, and signature boxes not yet baked into the PDF
- `zoom`, page pixel `size` from the last render
- `panel` — which settings sheet is open
- `view` — `"page"` (canvas) or `"document"` (TipTap extract)
- `compressAmount` — slider 0–100, default 50 (Balanced)
- `compressCompare` — last successful before/after sizes
- `bwDone` — black-and-white button stays disabled until a new file
- `lockPw`, `lockPw2` — protect form
- undo stack from `usePageUndo` (8 snapshots of bytes, overlays, and page)

### `apply(fn)`

Shared path for rotate, pages, merge, black-and-white, and “apply document text”. It snapshots undo, sets `working`, runs `fn` to get new bytes, then `setBytes`. On failure it drops the snapshot and shows the generic error toast. It does not upload.

Compress does not use `apply` unchanged: it always compresses the original upload and only commits smaller output. Protect does not use `apply` either: it downloads the locked file and leaves the preview unlocked, because the viewer cannot reopen encrypted bytes without a password.

### Download

`downloadCurrent` saves the current preview as `name` with a `.pdf` stem. Protect downloads `name-protected.pdf` from the encrypted buffer and does not call `setBytes`.

### Zoom

View zoom is a CSS scale. It is not the PDF render scale. Minimum zoom is `0.2` so Fit width can place a letter page inside a 320px screen. Maximum is `2.5`. On viewports at or below 767px, a `ResizeObserver` calls fit-width when the workspace width or page width actually changes (it ignores scrollbar-sized jitters).

The preview scroller is the workspace div (`overflow: auto`, `min-w-0`). The page itself must not grow sideways. Do not hide overflow on `body` to mask a layout bug.

### Panels

- Rotate: 90° left or right, current page or all pages, then `rotatePages`.
- Compress: slider, estimate, Compress PDF, Reset. Reset only sets the slider back to 50. It does not recompress.
- Protect: two password fields, 5–15 characters, any letters, numbers, or symbols, must match, then `encryptPdf` and download.
- Pages: keep this page (`extractPages`) or delete this page (`deletePages`).
- Merge: add another PDF under 10 MB, then `mergePdfs([current, ...extras])`.

Sign, hide, and black-and-white are buttons under the breadcrumb when that job is active. Hide adds a white cover overlay. Sign opens `SignaturePad`. Black-and-white calls `toGrayscalePdf` on the original upload.

Text editor mode (`view === "document"`) shows extracted HTML. Apply runs `htmlToPdf`. “Apply to preview” on the page view runs `bakeTextOverlays` and then clears overlays.

## Components

### Shell and marketing

`SiteChrome.tsx` — `SiteHeader` (landing only: logo, Tools, About, language, mobile menu) and `SiteFooter` (tool links that set `job`, privacy, about, © 2026, author link). The editor does not use this header. It uses `DocumentHeader`.

`ToolPage.tsx` — `Breadcrumbs` (Home / current tool only, one line, no filename), `PrivacyNotice`, `ToolPageLayout`, and shared button / loading / error / empty pieces. Breadcrumb Home leaves the tool page (`setJob(null)` before upload, `hardClear` after a file is open).

`UploadDropzone.tsx` — the tool-page drop zone. It uses the PDF context open path and the 10 MB check.

`FileDrop.tsx` — older drop target still used by the unused `Tools` and `Editor` pages. The live upload control is `UploadDropzone`.

`PrivacyTrust.tsx` — full privacy card, or `compact` for the editor. Compact shows the word Private (translation key `private_short`). Tap opens “Your PDF is processed locally in your browser.” (`private_local`). The note is portaled to `document.body` so it is not trapped by the header blur.

`Layout.tsx` — outlet plus global `Toast` and `PasswordModal`. When a file is open the shell is `h-dvh` and `overflow-hidden`. When it is not, the landing page can grow and scroll.

`PasswordModal.tsx` — shown when `passwordOpen` is true. Submit calls `submitPassword`. Cancel calls `cancelPassword`. Wrong password must not close it.

`Toast.tsx` — reads `toasts` from context.

`ActivityLog.tsx` — renders `activity`. Not the main editor chrome.

`LanguageSwitcher.tsx` — `en` / `hi` / `es`.

`Icon.tsx` — inline SVG icons by name (`brand`, `download`, `undo`, `more`, tool icons, and so on).

`AuthorCredit.tsx` and `LinkedInIcon.tsx` — author mark. The live credit is the footer link in `SiteChrome.tsx`, using `src/lib/author.ts`.

### Editor chrome

`DocumentHeader.tsx` — the bar after a file is open.

- Row priority on a phone: PDF Studio, current document, Download, More, Undo, Redo, Private.
- PDF Studio stays visible. It is not hidden to save space.
- Filename is about 15px. It may use two lines on a phone. It never grows to four or five lines. If it does not fit, it is cut to `start…pdf` and the `.pdf` suffix is kept. Measurement uses the real element (`scrollHeight` / `scrollWidth`), not a guess.
- Full name is the `title` tooltip and the document-information sheet (`onShowInfo`).
- Metadata under the name is about 13px: size, page count, and a before → after note after a successful compress.
- Undo and Redo are 44px icon buttons with accessible names. They fade when there is nothing to undo or redo.
- Download is the blue primary button and stays a 44px target.
- More is the `⋯` button. The menu content is passed in from `Home`.

`BottomBar.tsx` — not `position: fixed`. It sits under the preview in normal flow so it does not cover the page. Controls are 44px. Page group (previous, `n / total`, next) and zoom group (out, percent, in, fit width, fit page) wrap onto two rows when the screen is narrow instead of becoming one tall column. Fit page stays available on phones. Zoom out stops at `0.2`.

`PdfCanvas.tsx` — draws the current page. It uses the shared PDF.js document when `pdf` is passed. Render scale is `RENDER_SCALE` (1.35). Pixel ratio is `min(devicePixelRatio, 2)` so the bitmap is sharp and the CSS size stays the logical size. Scan mode (print check) uses ratio 1. It calls `onRendered` with that logical size. Children (overlays) sit on top of the canvas. Unmount clears the canvas.

`TextOverlay.tsx` — a box on the page. Kinds: `text`, `cover`, `replace`, `sign`. Text uses TipTap. Cover is a white rectangle. Sign is an image (`src`) and must not be pushed through the text editor. Boxes are in preview pixels. `bakeTextOverlays` converts them to PDF points. They are not in the file until Apply to preview.

`PageThumbs.tsx` — thumbnail strip. On small screens `Home` shows it as an overlay from the More menu, not as a second page scrollbar.

`ToolRail.tsx` — Master Edit tools. Collapsed to 48px under 1024px so the preview keeps the width. Selecting a tool on a small screen collapses it again.

`CommandPalette.tsx` — command list opened from More or Ctrl/Cmd+K.

`DocumentEditor.tsx` — TipTap for extracted document HTML. Font size extension is `src/extensions/FontSize.ts`.

`EditTextPopup.tsx` and `ExistingTextLayer.tsx` — older click-a-line editing pieces. The live text path is overlays plus the document editor. Do not revive a second text system unless the user asks.

`SignaturePad.tsx` — Fabric pencil on a white canvas (strokes were disappearing on a transparent canvas). On Done, near-white pixels become transparent and the ink is cropped, then `Home` adds a `kind: "sign"` overlay. Apply to preview bakes that image. The pad does not insert the signature into TipTap.

## PDF engine

Do not restyle these files as part of a layout task. Read them before changing sizes, passwords, or compression.

### `src/lib/constants.ts`

- `MAX_FILE_BYTES` = 10485760
- `PRINT_CHECK_ENABLED` = false
- `ACCEPTED_PDF` = `application/pdf,.pdf`
- `JPEG_COMPRESS_QUALITY` = 0.6 (not the live compress slider; the slider uses `jpegForAmount`)
- `PRINT_LUMINANCE_THRESHOLD` = 200 (print check only)

### `src/lib/fileGate.ts`

`assertPdfFileSize`, `isPdfFile`, `readPdfBytes`, and `FileTooLargeError`. Size is checked on `file.size` before the file is read.

### `src/lib/pdfjs.ts`

PDF.js setup. The worker URL is `pdfjs-dist/build/pdf.worker.min.mjs?url`.

- `RENDER_SCALE` = 1.35. Overlay hit boxes assume this scale. Do not change it casually.
- `getPdfDocument(bytes, password?)` copies the bytes (`data.slice()`) so later edits cannot detach PDF.js’s buffer.
- `isPasswordError`
- `renderPageToCanvas(page, canvas, scale, pixelRatio)` — bitmap size is `scale * pixelRatio`; returned width and height are the CSS size.
- `extractPageTextLines` — text positions in canvas space.
- `extractDocumentHtml` — HTML for the document editor, plus `hasText`.

### `src/lib/pdfOps.ts`

pdf-lib writes. All of this stays on the device.

- `loadPdf`, `mergePdfs`, `extractPages`, `deletePages`, `rotatePages`
- `bakeTextOverlays` — draws covers, replacement whites, text (standard fonts via fontkit), and signature PNGs. Preview pixel box is scaled onto the PDF page. PDF y grows upward; the overlay y grows downward.
- `toGrayscalePdf` — rasterizes each page, converts pixels to gray, embeds JPEG, and draws it back at the original page point size (`viewport scale 1`). Render scale is capped (`min(2200 / longEdge, 2.5)`) so the page does not get larger in the viewer. It does not change the media box to the bitmap size.
- `compressionTargetRatio(amount)` — 0 → about 0.72, 50 → 0.50, 100 → 0.25. Linear between those stops. Always below 1.
- `compressPdf(bytes, amount)` — probes page 1 to pick an edge length, rasterizes every page from the bytes you pass, and retries smaller if the result is still at least as big as the input. `Home` must pass the original upload. The estimate on screen is `uploadSize * compressionTargetRatio(amount)`, shown before the user presses Compress.
- Print helpers `scanPrintLegibility`, `scanPrintDocument`, `fixPdfForPrint`, `boostPrintContrast` exist but the UI flag is off. Colored badges must not be flattened to black if that work is ever turned on again; that was an earlier bug.
- `htmlToPdf` — builds a PDF from the document editor HTML.

### `src/lib/qpdf.ts`

Encrypt and decrypt only.

The Vite alias `@qpdf-engine` points at `node_modules/@jspawn/qpdf-wasm/qpdf.js`. Do not import `@jspawn/qpdf-wasm`’s default `qpdf.mjs` entry. That build calls `createModule`, which is undefined in the browser, and protect/decrypt then fail. Restart the dev server after changing the alias.

`getQpdf` loads the wasm module once. `writeAndRun` writes `/in.pdf`, runs the CLI, treats exit status 0 as success, reads `/out.pdf` only if it looks like a PDF (`%` header), then deletes the temp files.

- `decryptPdf(bytes, password)` — args `--password=… --decrypt`
- `encryptPdf(bytes, password)` — password length 5–15 (counted in Unicode code points). Args: `--allow-weak-crypto --encrypt <pass> <pass> 256 --`
- `assertLoadable` — pdf-lib load check, not the normal open path

### `src/lib/fonts.ts`

Font ids `helvetica`, `times`, `courier`, sizes, CSS names, and `embedStandardFont` for pdf-lib.

### `src/lib/format.ts`

`formatFileSize` (B / KB / MB) and `formatClock` for the activity log.

### `src/lib/download.ts`

`downloadBytes` creates a tracked object URL, clicks a temporary `<a download>`, then revokes the URL. `stem` strips a trailing `.pdf`.

### `src/lib/memory.ts`

Tracks object URLs and clears canvases (including setting width and height to 0 so the bitmap can be freed).

### `src/lib/author.ts`

`AUTHOR.name`, `AUTHOR.title`, `AUTHOR.linkedInUrl`.

## Hooks

### `src/hooks/usePdfDoc.ts`

Opens one PDF.js document for the current `bytes` and destroys it when bytes change or the component unmounts. `PdfCanvas` and `PageThumbs` share it. This is separate from the short-lived documents inside `pdfOps` and `ingest`.

### `src/hooks/usePageUndo.ts`

Up to 8 snapshots. Each snapshot copies the PDF bytes and the overlay list. `push` clears redo. `dropLast` removes a snapshot when the matching operation failed. `reset` runs on clear.

## Build and hosting

### `vite.config.ts`

React and Tailwind plugins. Alias `@` → `/src`. Alias `@qpdf-engine` → the qpdf JS file above. PDF.js, pdf-lib, and Fabric are prebundled. `@jspawn/qpdf-wasm` is excluded from optimizeDeps so Vite does not grab the broken entry. Build target `es2022`, output `dist/`, no source maps.

### `public/_headers`

Security headers for Cloudflare. CSP allows wasm eval and blob workers. `connect-src 'self'` means the app must not call an API with the file.

### `public/_redirects`

SPA fallback for Pages.

### `tsconfig.json`

Strict TypeScript, `noUnusedLocals`, `noUnusedParameters`. A new import that is not used will fail the check. `tsc` on this machine can run out of memory; that is an environment limit, not a code error.

### `developer-rules.md` and `role.md`

Older guardrails (no upload, 10 MB, object URL cleanup, no typing on Fabric). If they disagree with this guide about a behavior that was changed on purpose (compression, passwords, signature images, print check off), follow this guide and the code.

## What “working properly” means

Another model should be able to do the next UI task without relearning these rules:

1. Change layout in `Home.tsx`, `src/components`, and `src/index.css`. Leave `pdfOps.ts`, `qpdf.ts`, and `PdfContext` open/decrypt behavior alone unless the task is a processing bug.
2. Keep compress aimed at the original upload and below that size. Slider labels are Light, Balanced, and Maximum.
3. Keep protect as a download of a locked file. Preview stays unlocked.
4. Keep black-and-white at the original page size, sourced from the upload, and disable the button after success.
5. Keep signatures as image overlays.
6. Keep one route and the `job` state.
7. On a phone, stack the editor header. Do not crush the filename to fit every desktop control on one row. Download stays easy to tap. More is secondary. The preview scrolls inside its own box. The bottom bar stays in the document flow.
8. Add translation keys in English, Hindi, and Spanish together.
9. Do not start a 4K layout pass unless the user asks.

## UI phases already requested

- Phase 1 — shell, tokens, header/footer, author in the footer.
- Phase 2 — landing hero, privacy, nine tool cards, featured Master Edit.
- Phase 3 — tool page with Home / Tool breadcrumb and upload. After upload the breadcrumb stays short and does not include the filename.
- Phase 4 — mobile editor header and workspace for 430, 414, 390, 375, 360, and 320px, portrait and landscape. Processing stays unchanged. 4K is out of scope.

Phase 4 in the current code: stacked `DocumentHeader`, two-line filename with `.pdf` kept when truncated, Private popover, document info sheet, compress slider class, bottom bar groups, preview fit-width down to zoom 0.2. The More sheet class `more-sheet` is still missing from `index.css` and should be added before calling that menu finished.
