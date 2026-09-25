# Quality Assurance & Developer Guardrails

Before writing, committing, or finalizing any code, you MUST adhere to these strict guardrails. This document ensures zero mistakes, zero server dependency, and maximum performance on Cloudflare Pages.

## 1. Absolute Restrictions (Anti-Patterns)
- 🚫 **NO Node.js Built-ins:** Never import `fs`, `path`, `os`, `crypto`, or `stream`. The code must execute strictly in the browser.
- 🚫 **NO Uploading:** Never use `fetch` or `axios` to send the `File` or `Blob` to an external URL. 
- 🚫 **NO In-Memory Overload:** Never read a PDF into memory without validating its size against `file.size <= 10485760` (10MB) first.
- 🚫 **NO Direct Canvas Typing:** Never attempt to capture keyboard events natively on `fabric.js` or `canvas` on mobile; the virtual keyboard will break. Always use a floating HTML `contenteditable` or `TipTap` layer over the canvas.

## 2. Memory & Asset Management (Crash Prevention)
- **ObjectURL Cleanup:** Every time `URL.createObjectURL(blob)` is called for rendering or downloading, it MUST be paired with `URL.revokeObjectURL()` once the task is complete to prevent memory leaks.
- **Canvas Clearing:** When a user navigates away or clears the editor, destroy the `fabric.js` instance and call `.clearRect(0, 0, width, height)` on the underlying PDF render canvas.
- **Worker Initialization:** When using `pdfjs-dist` in Vite, correctly load the worker from the public directory or via a Vite query suffix to prevent MIME type / CORS errors:
  ```javascript
  import * as pdfjsLib from "pdfjs-dist";
  import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;