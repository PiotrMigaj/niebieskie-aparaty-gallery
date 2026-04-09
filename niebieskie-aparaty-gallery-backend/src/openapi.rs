use utoipa::OpenApi;

use crate::{handlers, models::{Event, GalleryItem}};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Niebieskie Aparaty Gallery API",
        version = "1.0.0",
        description = "API for retrieving photography events and gallery items"
    ),
    paths(
        handlers::get_event,
        handlers::get_gallery,
    ),
    components(
        schemas(Event, GalleryItem)
    ),
    tags(
        (name = "events",  description = "Event lookup by access token"),
        (name = "gallery", description = "Gallery photo retrieval")
    )
)]
pub struct ApiDoc;
