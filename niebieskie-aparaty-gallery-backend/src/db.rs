use aws_sdk_dynamodb::{types::AttributeValue, Client};
use std::collections::HashMap;
use tracing::{debug, warn};

use crate::{errors::AppError, models::{Event, GalleryItem}};

#[tracing::instrument(skip(client), fields(table = %table_name, token_id = %token_id))]
pub async fn find_event_by_token_id(
    client: &Client,
    table_name: &str,
    token_id: &str,
) -> Result<Option<Event>, AppError> {
    debug!("Initiating DynamoDB Scan");

    let result = client
        .scan()
        .table_name(table_name)
        .filter_expression("tokenId = :tokenId")
        .expression_attribute_values(":tokenId", AttributeValue::S(token_id.to_string()))
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
        Some(item) => Ok(Some(parse_event(item)?)),
    }
}

#[tracing::instrument(skip(client), fields(table = %table_name, event_id = %event_id))]
pub async fn find_galleries_by_event_id(
    client: &Client,
    table_name: &str,
    event_id: &str,
) -> Result<Vec<GalleryItem>, AppError> {
    debug!("Initiating DynamoDB Query for galleries");

    let mut items: Vec<GalleryItem> = Vec::new();
    let mut last_key: Option<HashMap<String, AttributeValue>> = None;

    loop {
        let mut req = client
            .scan()
            .table_name(table_name)
            .filter_expression("eventId = :eventId")
            .expression_attribute_values(":eventId", AttributeValue::S(event_id.to_string()));

        if let Some(ref key) = last_key {
            for (k, v) in key {
                req = req.exclusive_start_key(k.clone(), v.clone());
            }
        }

        let result = req.send().await.map_err(|e| AppError::DynamoDb(e.into()))?;

        let page = result.items.unwrap_or_default();
        debug!(page_count = page.len(), "DynamoDB Scan page received");

        for item in page {
            items.push(parse_gallery_item(item)?);
        }

        last_key = result.last_evaluated_key;
        if last_key.is_none() {
            break;
        }
    }

    debug!(total_count = items.len(), "DynamoDB Query completed");
    Ok(items)
}

fn parse_gallery_item(item: HashMap<String, AttributeValue>) -> Result<GalleryItem, AppError> {
    let get_s = |key: &str| -> Result<String, AppError> {
        item.get(key)
            .and_then(|v| v.as_s().ok())
            .map(|s| s.to_string())
            .ok_or_else(|| AppError::Internal(format!("Missing or invalid field: {key}")))
    };

    Ok(GalleryItem {
        file_name: get_s("fileName")?,
        event_id: get_s("eventId")?,
        compressed_file_height: get_s("compressedFileHeight")?,
        compressed_file_name: get_s("compressedFileName")?,
        compressed_file_object_key: get_s("compressedFileObjectKey")?,
        compressed_file_presigned_url: get_s("compressedFilePresignedUrl")?,
        compressed_file_width: get_s("compressedFileWidth")?,
        original_file_object_key: get_s("originalFileObjectKey")?,
        original_file_presigned_url: get_s("originalFilePresignedUrl")?,
        presign_date_time: get_s("presignDateTime")?,
        username: get_s("username")?,
    })
}

fn parse_event(item: HashMap<String, AttributeValue>) -> Result<Event, AppError> {
    let get_s = |key: &str| -> Result<String, AppError> {
        item.get(key)
            .and_then(|v| v.as_s().ok())
            .map(|s| s.to_string())
            .ok_or_else(|| AppError::Internal(format!("Missing or invalid field: {key}")))
    };

    let get_opt_s = |key: &str| -> Option<String> {
        item.get(key)
            .and_then(|v| v.as_s().ok())
            .map(|s| s.to_string())
    };

    let get_bool = |key: &str| -> Result<bool, AppError> {
        item.get(key)
            .and_then(|v| v.as_bool().ok())
            .copied()
            .ok_or_else(|| AppError::Internal(format!("Missing or invalid field: {key}")))
    };

    Ok(Event {
        event_id: get_s("eventId")?,
        camel_gallery: get_bool("camelGallery")?,
        created_at: get_s("createdAt")?,
        date: get_s("date")?,
        description: get_opt_s("description"),
        gallery_id: get_opt_s("galleryId"),
        image_placeholder_object_key: get_s("imagePlaceholderObjectKey")?,
        selection_available: get_bool("selectionAvailable")?,
        title: get_s("title")?,
        token_id: get_s("tokenId")?,
        token_id_created_at: get_s("tokenIdCreatedAt")?,
        token_id_valid_days: get_s("tokenIdValidDays")?,
        username: get_s("username")?,
    })
}
