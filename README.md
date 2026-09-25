# PDF Studio

100% client-side PDF editor. No backend, no uploads. Built for **Cloudflare Pages**.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
```

Output: `dist/` — connect this GitHub repo to Cloudflare Pages, framework **Vite**. Enable **Bot Fight Mode** in the Cloudflare dashboard.

## Limits

- Max file size **10 MB** (checked on `File.size` before reading)
- All processing in the browser (PDF.js, pdf-lib, qpdf-wasm)
