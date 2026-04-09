# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Dev server**: `npm run dev` — starts Vite on http://localhost:3000
- **Build**: `npm run build` — outputs to `dist/`
- **Preview build**: `npm run preview`

To test the gallery, open: `http://localhost:3000?tokenId=anything` (any non-empty token grants access).

## Architecture

Single-page vanilla JS app served by Vite. No framework. Three JS modules + one HTML entry point.

### Entry flow (`index.html` → `src/main.js`)
1. `main.js` reads `?tokenId=` from the URL — any non-empty value passes validation
2. On valid token: generates 60 mock images (picsum.photos with deterministic seeds), then calls `initLightbox(images)` and `initGallery(images, lightbox)`
3. On invalid token: shows the `#access-denied` div

### Masonry gallery (`src/gallery.js`)
Uses `masonry-layout` (npm) for positioning. Key constraint: **item heights must be set via `el.style.height` before `new Masonry()` runs**, because masonry reads `offsetHeight` — it doesn't know image aspect ratios. The init sequence is strictly ordered:

```
buildItems() → applyHeights() → initMasonry() → setupObserver()
```

`applyHeights()` derives height from `image.width / image.height` and the CSS-rendered item width (read via `getBoundingClientRect` on the `.masonry-sizer` element). Column widths come from CSS media queries (not JS) — `masonry-layout` uses `percentPosition: true` and reads the `.masonry-sizer` element width.

Lazy loading uses `IntersectionObserver` with `rootMargin: '300px 0px'`. All placeholder `div`s stay in the DOM (so masonry height is stable); only `<img>` elements are created when items enter the pre-load margin.

### Lightbox (`src/lightbox.js`)
Toggled by adding/removing `hidden` class on `#lightbox`. Keyboard handler (ESC/arrows) is added on `open()` and removed on `close()` to avoid leaks. Download uses `fetch` → `blob` → `createObjectURL` because picsum images are cross-origin.

### Styling
- TailwindCSS via CDN (no build step) with one custom extension: `max-w-8xl: 88rem` and `font-italiana`
- Font Awesome 6 via CDN
- `src/style.css` contains: skeleton shimmer animation, masonry column-width responsive rules (the CSS that masonry-layout reads), and `margin-bottom: 16px` on `.masonry-item` for vertical row spacing

### Gap/spacing
Both horizontal and vertical gaps are **16px**. Horizontal is set via `gutter: 16` in the masonry options. Vertical is set via `margin-bottom: 16px` on `.masonry-item` in CSS. The CSS column widths account for the gutter: `calc(50% - 8px)` for 2 cols, `calc(33.333% - 10.667px)` for 3 cols.

### Real API integration
Mock data has been replaced. Backend runs on port 4000 (`cargo run` in the backend dir). Vite proxy (`vite.config.js`) forwards `/api/*` → `http://localhost:4000` for local dev — no env var needed. Test URL requires a real tokenId from DynamoDB: `http://localhost:3000?tokenId=<real-token>`.

**Docker deployment:** Frontend nginx proxies `/api/` → `http://gallery-backend:4000` (Docker service name) — mirrors VPS nginx so `localhost:3500` works identically to production. Both containers share `gallery-net` bridge network defined in root `docker-compose.yml`. Frontend mapped to host port 3500.

### Image object shape
Gallery and lightbox always display `compressedFilePresignedUrl`. Downloads use `originalFilePresignedUrl`. Internal image objects carry distinct fields:
- `thumbnailUrl` / `fullUrl` → `compressedFilePresignedUrl` (display)
- `downloadUrl` → `originalFilePresignedUrl` (download only)
- `fileName` → used as the download filename
- `width` / `height` → parsed from `compressedFileWidth` / `compressedFileHeight` (strings → ints)

### Downloading images
Do NOT use `fetch()` → blob → `createObjectURL` for downloads. S3 presigned URLs are cross-origin; fetch fails with a CORS error. Instead create an `<a href=url download=filename target=_blank>` and `.click()` it — the browser handles the download via S3's Content-Disposition header.
