# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
go run ./cmd/server   # start server on port 4000
go build ./cmd/server # compile binary
```

Env vars are loaded from `.env` via `godotenv`. Required: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Optional: `PORT` (default `4000`), `EVENTS_TABLE_NAME` (default `Events`), `GALLERIES_TABLE_NAME` (default `GalleriesCamel`), `RATE_LIMITING` (default `100`), `LOG_LEVEL` (default `info`).

## Architecture

Single-binary Go HTTP server using `go-chi/chi`. All routes prefixed `/api/`:
- `GET /api/event/{tokenId}` — look up event by access token
- `GET /api/gallery/{eventId}` — list gallery items for an event

**Module layout (`internal/`):**
- `config/` — loads env vars via `godotenv`
- `handlers/` — HTTP handlers for event and gallery routes
- `repository/` — DynamoDB access layer
- `middleware/` — rate limiting middleware

**DynamoDB:** Same AWS env vars as the Rust backend. Table names default to `Events` and `GalleriesCamel`.

**Docker deployment:** Multi-stage Dockerfile. Backend mapped to host port 4000. Shares `gallery-net` bridge network with the frontend container (defined in root `docker-compose.yml`).
