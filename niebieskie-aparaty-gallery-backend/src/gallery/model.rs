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
