# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
cargo build          # compile
cargo run            # start server (default port 4000)
cargo check          # fast type-check without linking
PORT=8080 cargo run  # run on a custom port
```

Environment variables are loaded from `.env` at startup via `dotenvy`.

## Architecture

Single-binary axum HTTP server. All routes are prefixed with `/api/`:
- `GET /api/event/{tokenId}` — look up event by access token
- `GET /api/gallery/{eventId}` — list gallery items for an event

**Module layout (`src/`):**
- `main.rs` — `AppState` (DynamoDB client + table name), router, CORS, server bind
- `handlers.rs` — `get_event()`, `get_gallery()`: DB calls, token expiry validation, JSON responses
- `db.rs` — DynamoDB `Scan` with `FilterExpression`; parse helpers for `Event` and `GalleryItem`
- `models.rs` — `Event`, `GalleryItem` structs; camelCase JSON via `#[serde(rename_all = "camelCase")]`
- `errors.rs` — `AppError` enum implementing `IntoResponse`; maps variants to 400/404/500
- `rate_limiter.rs` — per-UTC-day request counter; configurable via `RATE_LIMITING` env var (default 100)
- `openapi.rs` — `ApiDoc` struct (`#[derive(OpenApi)]`); registers paths and schemas for Swagger

**DynamoDB access:** `tokenId` is not the primary key (`eventId` is), so lookups use a full-table `Scan` with a filter. AWS credentials are read from environment (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`). Table name defaults to `Events`, overridable via `DYNAMODB_TABLE_NAME`.

**Token validity logic (in `handlers.rs`):**
```
expiry = tokenIdCreatedAt (YYYY-MM-DD) + tokenIdValidDays (days)
today > expiry  →  400 TokenExpired
```

**Error responses** are always JSON: `{"error": "<message>"}`.

**Docker deployment:** See `docker-compose.yml` in the repo root. Multi-stage Dockerfile: `rust:latest` builder + `ubuntu:24.04` runtime. Runtime image requires `ca-certificates` for HTTPS calls to AWS DynamoDB. Backend exposed on port 4000, mapped to host port 3501. VPS Nginx proxies `gallery.niebieskie-aparaty.pl/api/` → `localhost:3501`.
- Use `rust:latest` as builder — AWS SDK requires rustc ≥1.91.1; edition2024 requires ≥1.85
- Use `ubuntu:24.04` as runtime — `debian:bookworm-slim` has GLIBC 2.36 but binary needs 2.38/2.39
- Enable logging via `RUST_LOG=info` env var (uses `EnvFilter::from_default_env()`)

**CORS:** all origins, methods, and headers allowed (configured in `main.rs`).

**OpenAPI / Swagger:** served at `/swagger-ui`; JSON spec at `/api-docs/openapi.json`. Docs routes bypass the rate limiter (merged after `route_layer` in `main.rs`). Add `#[utoipa::path(...)]` to handlers and `ToSchema` to models when adding new endpoints.
