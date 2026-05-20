// `use` brings external items into scope so you don't have to write the full path each time.
// `serde` is a crate (Rust's term for a library/package) for serialization/deserialization.
// `Serialize` and `Deserialize` are traits — interfaces that types can implement.
use serde::{Deserialize, Serialize};
// `utoipa` is a crate for generating OpenAPI documentation from Rust types.
// `ToSchema` is a trait that lets utoipa describe this struct in the Swagger UI.
use utoipa::ToSchema;

// `#[derive(...)]` is a macro that auto-implements the listed traits for this struct.
// Debug   — allows printing the struct with `{:?}`
// Serialize/Deserialize — enables JSON conversion via serde
// ToSchema — registers the struct in the OpenAPI spec
#[derive(Debug, Serialize, Deserialize, ToSchema)]
// This attribute tells serde to convert Rust's snake_case field names (e.g. `event_id`)
// to camelCase (e.g. `eventId`) when serializing to/from JSON.
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
