mod db;
mod errors;
mod handlers;
mod models;
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
use openapi::ApiDoc;
use rate_limiter::RateLimiter;
use serde_json::json;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::{info, warn};
use tracing_subscriber::{fmt, EnvFilter};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

#[derive(Clone)]
pub struct AppState {
    pub dynamo_client: Client,
    pub events_table_name: String,
    pub galleries_table_name: String,
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

    let state = AppState {
        dynamo_client,
        events_table_name,
        galleries_table_name,
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
