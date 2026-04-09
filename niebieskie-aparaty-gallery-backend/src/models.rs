use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GalleryItem {
    pub file_name: String,
    pub event_id: String,
    pub compressed_file_height: String,
    pub compressed_file_name: String,
    pub compressed_file_object_key: String,
    pub compressed_file_presigned_url: String,
    pub compressed_file_width: String,
    pub original_file_object_key: String,
    pub original_file_presigned_url: String,
    pub presign_date_time: String,
    pub username: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub event_id: String,
    pub camel_gallery: Option<bool>,
    pub created_at: String,
    pub date: String,
    pub description: Option<String>,
    pub gallery_id: Option<String>,
    pub image_placeholder_object_key: Option<String>,
    pub selection_available: Option<bool>,
    pub title: String,
    pub token_id: Option<String>,
    pub token_id_created_at: Option<String>,
    pub token_id_valid_days: Option<String>,
    pub username: String,
}
