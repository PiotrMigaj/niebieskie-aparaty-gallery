use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use tracing::error;

#[derive(Debug)]
pub enum AppError {
    NotFound,
    TokenExpired,
    DynamoDb(aws_sdk_dynamodb::Error),
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "Event not found".to_string()),
            AppError::TokenExpired => (StatusCode::BAD_REQUEST, "Token has expired".to_string()),
            AppError::DynamoDb(e) => {
                error!(error = %e, "DynamoDB error");
                (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {e}"))
            }
            AppError::Internal(msg) => {
                error!(message = %msg, "Internal server error");
                (StatusCode::INTERNAL_SERVER_ERROR, msg)
            }
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}

impl From<aws_sdk_dynamodb::Error> for AppError {
    fn from(e: aws_sdk_dynamodb::Error) -> Self {
        AppError::DynamoDb(e)
    }
}
