# ---- build ----
FROM rust:latest AS builder
WORKDIR /app

# Cache dependencies separately from source
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs \
    && cargo build --release \
    && rm -f target/release/deps/niebieskie_aparaty_gallery_backend*

COPY src ./src
RUN cargo build --release

# ---- runtime ----
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/niebieskie-aparaty-gallery-backend .

EXPOSE 4000
CMD ["./niebieskie-aparaty-gallery-backend"]
