// `mod` declares a module that belongs to this crate.
// Rust looks for the module's code either in `<name>.rs` or `<name>/mod.rs`.
// Here `mod event` finds `src/event/mod.rs`, and `mod gallery` finds `src/gallery/mod.rs`.
// We no longer need `mod db` or `mod models` — those are replaced by the new modules.
mod errors;
mod event;
mod gallery;
mod handlers;
mod openapi;
mod rate_limiter;

use std::sync::Arc;

use aws_sdk_dynamodb::Client;
use axum::{
    extract::State,
    http::{Request, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
// Import the concrete repository structs to instantiate them in `main()`.
use event::repository::DynamoDbEventRepository;
use gallery::repository::DynamoDbGalleryRepository;
use openapi::ApiDoc;
use rate_limiter::RateLimiter;
use serde_json::json;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::{info, warn};
use tracing_subscriber::{fmt, EnvFilter};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

// `AppState` is shared across all Axum request handlers via Axum's `State` extractor.
// Axum requires `AppState` to implement `Clone`, which works here because:
//   - `Arc<T>` always implements `Clone` (it just increments the reference count)
//   - The `dyn Trait` objects live behind `Arc`, so they don't need to be `Clone` themselves
#[derive(Clone)]
pub struct AppState {
    // `Arc` (Atomically Reference Counted) lets multiple handlers share the same repository
    // instance safely across async tasks without copying the data.
    // `dyn EventRepository` is a "trait object" — it holds any type that implements
    // `EventRepository`, chosen at runtime. This is Rust's form of dynamic dispatch.
    pub event_repo: Arc<dyn event::repository::EventRepository>,
    pub gallery_repo: Arc<dyn gallery::repository::GalleryRepository>,
    pub rate_limiter: Arc<RateLimiter>,
}

#[tracing::instrument(skip(state, req, next), fields(path = %req.uri().path()))]
async fn rate_limit_middleware(
    State(state): State<AppState>,
    req: Request<axum::body::Body>,
    next: Next,
) -> Response {
    if !state.rate_limiter.check() {
        warn!("Rate limit exceeded");
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({ "error": "Rate limit exceeded" })),
        )
            .into_response();
    }
    next.run(req).await
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    fmt().with_env_filter(EnvFilter::from_default_env()).init();

    let aws_config = aws_config::load_from_env().await;
    let dynamo_client = Client::new(&aws_config);

    let events_table_name =
        std::env::var("EVENTS_TABLE_NAME").unwrap_or_else(|_| "Events".to_string());
    let galleries_table_name =
        std::env::var("GALLERIES_TABLE_NAME").unwrap_or_else(|_| "GalleriesCamel".to_string());

    let rate_limit: u32 = std::env::var("RATE_LIMITING")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(100)
        .max(1);

    // Instantiate the concrete DynamoDB repositories.
    // We wrap them in `Arc` so they can be stored as `Arc<dyn Trait>` in AppState.
    // `dynamo_client.clone()` is cheap — the AWS SDK client is already Arc-wrapped internally.
    let event_repo = Arc::new(DynamoDbEventRepository::new(
        dynamo_client.clone(),
        events_table_name,
    ));
    let gallery_repo = Arc::new(DynamoDbGalleryRepository::new(
        dynamo_client,
        galleries_table_name,
    ));

    let state = AppState {
        event_repo,
        gallery_repo,
        rate_limiter: Arc::new(RateLimiter::new(rate_limit)),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api_routes = Router::new()
        .route("/api/event/{tokenId}", get(handlers::get_event))
        .route("/api/gallery/{eventId}", get(handlers::get_gallery))
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            rate_limit_middleware,
        ))
        .with_state(state);

    let swagger_router = SwaggerUi::new("/swagger-ui")
        .url("/api-docs/openapi.json", ApiDoc::openapi());

    let app = api_routes
        .merge(swagger_router)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let port = std::env::var("PORT").unwrap_or_else(|_| "4000".to_string());
    let addr = format!("0.0.0.0:{port}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    info!(addr = %addr, rate_limit = rate_limit, "Server listening");
    axum::serve(listener, app).await.unwrap();
}
