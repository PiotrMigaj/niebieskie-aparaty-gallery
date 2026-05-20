use async_trait::async_trait;
use aws_sdk_dynamodb::{types::AttributeValue, Client};
use std::collections::HashMap;
use tracing::debug;

use super::model::GalleryItem;
use crate::errors::AppError;

#[async_trait]
pub trait GalleryRepository: Send + Sync {
    async fn find_by_event_id(&self, event_id: &str) -> Result<Vec<GalleryItem>, AppError>;
}

#[derive(Clone)]
pub struct DynamoDbGalleryRepository {
    client: Client,
    table_name: String,
}

impl DynamoDbGalleryRepository {
    pub fn new(client: Client, table_name: impl Into<String>) -> Self {
        Self {
            client,
            table_name: table_name.into(),
        }
    }

    fn parse(item: HashMap<String, AttributeValue>) -> Result<GalleryItem, AppError> {
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
}

#[async_trait]
impl GalleryRepository for DynamoDbGalleryRepository {
    #[tracing::instrument(skip(self), fields(table = %self.table_name, event_id = %event_id))]
    async fn find_by_event_id(&self, event_id: &str) -> Result<Vec<GalleryItem>, AppError> {
        debug!("Initiating DynamoDB Scan for galleries");

        let mut items: Vec<GalleryItem> = Vec::new();
        let mut last_key: Option<HashMap<String, AttributeValue>> = None;

        // DynamoDB Scan is paginated — we loop until `last_evaluated_key` is None,
        // which signals the final page.
        loop {
            let mut req = self.client
                .scan()
                .table_name(&self.table_name)
                .filter_expression("eventId = :eventId")
                .expression_attribute_values(":eventId", AttributeValue::S(event_id.to_string()));

            // If we have a pagination cursor from the previous page, pass it along.
            if let Some(ref key) = last_key {
                for (k, v) in key {
                    req = req.exclusive_start_key(k.clone(), v.clone());
                }
            }

            let result = req.send().await.map_err(|e| AppError::DynamoDb(e.into()))?;

            let page = result.items.unwrap_or_default();
            debug!(page_count = page.len(), "DynamoDB Scan page received");

            for item in page {
                items.push(Self::parse(item)?);
            }

            last_key = result.last_evaluated_key;
            if last_key.is_none() {
                break;
            }
        }

        // Scan doesn't guarantee order, so we sort by file name for a consistent response.
        items.sort_by(|a, b| a.file_name.cmp(&b.file_name));

        debug!(total_count = items.len(), "DynamoDB Scan completed");
        Ok(items)
    }
}
