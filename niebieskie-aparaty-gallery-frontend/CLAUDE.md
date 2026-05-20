# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Dev server**: `npm run dev` — starts Vite on http://localhost:3000
- **Build**: `npm run build` — outputs to `dist/`
- **Preview build**: `npm run preview`

To test the gallery, open: `http://localhost:3000?tokenId=<real-token>` (requires a real tokenId from DynamoDB).

## Architecture

Single-page vanilla JS app served by Vite. No framework. Web Components + Composable pattern.

### File structure
- `src/components/` — Custom Elements: `GalleryItem` (`<gallery-item>`), `GalleryGrid` (`<gallery-grid>`), `PhotoLightbox` (`<photo-lightbox>`)
- `src/composables/` — Logic factories: `useApi`, `useEvent`, `useGallery`, `useMasonry`
- `src/main.js` — Orchestrator: wires composables to components

### Entry flow (`index.html` → `src/main.js`)
1. `main.js` reads `?tokenId=`, calls `useEvent().load(tokenId)` → `useGallery().load(eventId)`
2. On success: sets `lightbox.images`, binds `gallery-item-click` event, calls `grid.addImages(images)`
3. On error/missing token: shows `#access-denied`

### Masonry gallery (`<gallery-grid>` + `useMasonry`)
Uses `masonry-layout` (npm) for positioning. Key constraint: **item heights must be set before `new Masonry()` runs**, because masonry reads `offsetHeight`. `GalleryGrid.addImages()` reads the `.masonry-sizer` width via `getBoundingClientRect`, derives each item's height from `image.width / image.height`, sets it as an inline style, then initializes masonry.

**Lazy init:** `addImages()` initializes masonry on first call (after the container's `hidden` class is removed). Do NOT init in `connectedCallback` — the container is still `display:none` at that point, so `getBoundingClientRect()` returns 0 and items get no height.

Column widths come from CSS media queries (not JS) — `masonry-layout` uses `percentPosition: true` and reads the `.masonry-sizer` element width.

Lazy loading uses `IntersectionObserver` with `rootMargin: '300px 0px'` set up in `GalleryItem.connectedCallback`. Skeleton divs stay in DOM for masonry height stability; `<img>` elements are created only when items enter the pre-load margin.

### Lightbox (`<photo-lightbox>`)
Self-contained custom element. Renders its own DOM in `connectedCallback`. Call `lightbox.show(index)` / `lightbox.hide()`. Set `lightbox.images` (array) before calling `show()`. Keyboard handler (ESC/arrows) is added on `show()` and removed on `hide()` to avoid leaks.

### Styling
- TailwindCSS via CDN (no build step) with custom extensions: `max-w-8xl: 88rem` and `font-italiana`
- Font Awesome 6 via CDN
- `src/style.css` contains: skeleton shimmer animation, masonry column-width responsive rules, `margin-bottom: 8px` on `.masonry-item`, and `gallery-grid { display: block }` (see gotcha below)

### Gap/spacing
Both horizontal and vertical gaps are **8px**. Horizontal is set via `gutter: 8` in the masonry options. Vertical is set via `margin-bottom: 8px` on `.masonry-item` in CSS. The CSS column widths account for the gutter: `calc(50% - 4px)` for 2 cols, `calc(33.333% - 5.333px)` for 3 cols.

### Real API integration
Backend runs on port 4000. Vite proxy (`vite.config.js`) forwards `/api/*` → `http://localhost:4000` for local dev — no env var needed.

**Docker deployment:** Frontend nginx proxies `/api/` → `http://gallery-backend:4000` (Docker service name). Both containers share `gallery-net` bridge network defined in root `docker-compose.yml`. Frontend mapped to host port 3500.

### Image object shape
Gallery and lightbox always display `compressedFilePresignedUrl`. Downloads use `originalFilePresignedUrl`. Internal image objects carry distinct fields:
- `thumbnailUrl` / `fullUrl` → `compressedFilePresignedUrl` (display)
- `downloadUrl` → `originalFilePresignedUrl` (download only)
- `fileName` → used as the download filename
- `width` / `height` → parsed from `compressedFileWidth` / `compressedFileHeight` (strings → ints)

### Downloading images
Do NOT use `fetch()` → blob → `createObjectURL` for downloads. S3 presigned URLs are cross-origin; fetch fails with a CORS error. Instead create an `<a href=url download=filename target=_blank>` and `.click()` it — the browser handles the download via S3's Content-Disposition header.

## Gotchas

### Custom element `display: inline`
Custom elements default to `display: inline`. Any container used for layout (e.g. `gallery-grid`) **must** have `display: block` in `style.css`, or CSS width utilities (`w-full`) and masonry measurement will silently fail — the sizer returns width=0 and items collapse to 0 height with no error.

### DOM construction — no `innerHTML`
A security hook in this project blocks `innerHTML`. Always build UI with `document.createElement` / `classList` / `appendChild`. Never assign to `innerHTML`.
