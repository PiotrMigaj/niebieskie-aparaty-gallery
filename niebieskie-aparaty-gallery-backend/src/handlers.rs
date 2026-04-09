use axum::{
    extract::{Path, State},
    Json,
};
use chrono::NaiveDate;
use tracing::{info, warn};

use crate::{db, errors::AppError, models::{Event, GalleryItem}, AppState};

#[utoipa::path(
    get,
    path = "/api/event/{tokenId}",
    params(
        ("tokenId" = String, Path, description = "Time-limited access token for the event")
    ),
    responses(
        (status = 200, description = "Event found", body = Event),
        (status = 400, description = "Token expired", body = inline(serde_json::Value), example = json!({"error": "Token has expired"})),
        (status = 404, description = "Event not found", body = inline(serde_json::Value), example = json!({"error": "Event not found"})),
        (status = 500, description = "Internal server error", body = inline(serde_json::Value), example = json!({"error": "Internal server error"}))
    ),
    tag = "events"
)]
#[tracing::instrument(skip(state), fields(token_id = %token_id))]
pub async fn get_event(
    State(state): State<AppState>,
    Path(token_id): Path<String>,
) -> Result<Json<Event>, AppError> {
    let event = db::find_event_by_token_id(&state.dynamo_client, &state.events_table_name, &token_id)
        .await?
        .ok_or(AppError::NotFound)?;

    info!(event_id = %event.event_id, username = %event.username, "Event found");

    let created_at = event.token_id_created_at.as_deref()
        .ok_or_else(|| AppError::Internal("Missing tokenIdCreatedAt".to_string()))
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d")
            .map_err(|e| AppError::Internal(format!("Invalid tokenIdCreatedAt: {e}"))))?;

    let valid_days: i64 = event.token_id_valid_days.as_deref()
        .ok_or_else(|| AppError::Internal("Missing tokenIdValidDays".to_string()))
        .and_then(|s| s.parse()
            .map_err(|e| AppError::Internal(format!("Invalid tokenIdValidDays: {e}"))))?;

    let expiry = created_at + chrono::Duration::days(valid_days);
    let today = chrono::Utc::now().date_naive();

    if today > expiry {
        warn!(expiry = %expiry, today = %today, "Token expired");
        return Err(AppError::TokenExpired);
    }

    let event_id = event.event_id.clone();
    info!(event_id = %event_id, "Returning event");
    Ok(Json(event))
}

#[utoipa::path(
    get,
    path = "/api/gallery/{eventId}",
    params(
        ("eventId" = String, Path, description = "Unique identifier of the event")
    ),
    responses(
        (status = 200, description = "Gallery items returned", body = Vec<GalleryItem>),
        (status = 500, description = "Internal server error", body = inline(serde_json::Value), example = json!({"error": "Internal server error"}))
    ),
    tag = "gallery"
)]
#[tracing::instrument(skip(state), fields(event_id = %event_id))]
pub async fn get_gallery(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
) -> Result<Json<Vec<GalleryItem>>, AppError> {
    let items =
        db::find_galleries_by_event_id(&state.dynamo_client, &state.galleries_table_name, &event_id)
            .await?;

    info!(event_id = %event_id, count = items.len(), "Returning gallery items");
    Ok(Json(items))
}
