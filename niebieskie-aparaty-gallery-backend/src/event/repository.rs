// `async_trait` is a crate that enables `async fn` inside trait definitions.
// Without it, Rust doesn't natively support async methods in traits (as of stable Rust).
use async_trait::async_trait;
use aws_sdk_dynamodb::{types::AttributeValue, Client};
use std::collections::HashMap;
use tracing::{debug, warn};

// `super` refers to the parent module — here that's the `event` module.
// So `super::model::Event` means `event::model::Event`.
use super::model::Event;
// `crate` is the root of the current crate (project).
// `crate::errors::AppError` is the shared error type defined in src/errors.rs.
use crate::errors::AppError;

// A `trait` in Rust is like an interface — it defines a contract that types must fulfill.
// `Send + Sync` are marker traits required to share the value across async tasks/threads.
// `#[async_trait]` enables async methods in the trait definition.
#[async_trait]
pub trait EventRepository: Send + Sync {
    async fn find_by_token_id(&self, token_id: &str) -> Result<Option<Event>, AppError>;
}

// This is the concrete DynamoDB implementation of `EventRepository`.
// `#[derive(Clone)]` auto-implements `Clone` so `AppState` (which wraps this in an `Arc`) can be cloned by Axum.
#[derive(Clone)]
pub struct DynamoDbEventRepository {
    client: Client,
    table_name: String,
}

impl DynamoDbEventRepository {
    // An associated function (no `self`) — Rust's equivalent of a constructor.
    // `impl Into<String>` accepts anything that can become a `String` (e.g. `&str` or `String`).
    pub fn new(client: Client, table_name: impl Into<String>) -> Self {
        Self {
            client,
            table_name: table_name.into(),
        }
    }

    // Private helper to parse a DynamoDB item (a HashMap) into an `Event`.
    // `HashMap<String, AttributeValue>` is the raw DynamoDB row representation.
    fn parse(item: HashMap<String, AttributeValue>) -> Result<Event, AppError> {
        // Closure that extracts a required String field from the DynamoDB item.
        // Returns `AppError::Internal` if the field is missing.
        let get_s = |key: &str| -> Result<String, AppError> {
            item.get(key)
                .and_then(|v| v.as_s().ok())
                .map(|s| s.to_string())
                .ok_or_else(|| AppError::Internal(format!("Missing or invalid field: {key}")))
        };

        // Closure for optional String fields — returns `None` if the field is absent.
        let get_opt_s = |key: &str| -> Option<String> {
            item.get(key).and_then(|v| v.as_s().ok()).map(|s| s.to_string())
        };

        // Closure for optional bool fields.
        let get_opt_bool = |key: &str| -> Option<bool> {
            item.get(key).and_then(|v| v.as_bool().ok()).copied()
        };

        Ok(Event {
            event_id: get_s("eventId")?,
            camel_gallery: get_opt_bool("camelGallery"),
            created_at: get_s("createdAt")?,
            date: get_s("date")?,
            description: get_opt_s("description"),
            gallery_id: get_opt_s("galleryId"),
            image_placeholder_object_key: get_opt_s("imagePlaceholderObjectKey"),
            selection_available: get_opt_bool("selectionAvailable"),
            title: get_s("title")?,
            token_id: get_opt_s("tokenId"),
            token_id_created_at: get_opt_s("tokenIdCreatedAt"),
            token_id_valid_days: get_opt_s("tokenIdValidDays"),
            username: get_s("username")?,
        })
    }
}

// `impl Trait for Type` is how you fulfill a trait contract in Rust.
// Here we implement the `EventRepository` interface for `DynamoDbEventRepository`.
#[async_trait]
impl EventRepository for DynamoDbEventRepository {
    #[tracing::instrument(skip(self), fields(table = %self.table_name, token_id = %token_id))]
    async fn find_by_token_id(&self, token_id: &str) -> Result<Option<Event>, AppError> {
        debug!("Initiating DynamoDB Scan for Event");

        let result = self.client
            .scan() // Using SCAN with filter expression (tokenId is not the primary key)
            .table_name(&self.table_name)
            .filter_expression("tokenId = :tokenId AND camelGallery = :camelGallery")
            .expression_attribute_values(":tokenId", AttributeValue::S(token_id.to_string()))
            .expression_attribute_values(":camelGallery", AttributeValue::Bool(true))
            .send()
            .await
            .map_err(|e| AppError::DynamoDb(e.into()))?;

        let items = result.items.unwrap_or_default();
        debug!(item_count = items.len(), "DynamoDB Scan completed");

        match items.into_iter().next() {
            None => {
                warn!("No event found for token_id");
                Ok(None)
            }
            Some(item) => Ok(Some(Self::parse(item)?)),
        }
    }
}
