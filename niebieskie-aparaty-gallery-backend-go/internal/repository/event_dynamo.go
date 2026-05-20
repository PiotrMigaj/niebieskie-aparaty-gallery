package repository

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/pmigaj/niebieskie-aparaty-gallery-backend/internal/models"
)

type DynamoEventRepository struct {
	client    *dynamodb.Client
	tableName string
}

func NewDynamoEventRepository(client *dynamodb.Client, tableName string) *DynamoEventRepository {
	return &DynamoEventRepository{client: client, tableName: tableName}
}

func (r *DynamoEventRepository) FindByTokenID(ctx context.Context, tokenID string) (*models.Event, error) {
	slog.DebugContext(ctx, "dynamo scan start", "table", r.tableName, "tokenId", tokenID)

	result, err := r.client.Scan(ctx, &dynamodb.ScanInput{
		TableName:        aws.String(r.tableName),
		FilterExpression: aws.String("tokenId = :tokenId AND camelGallery = :camelGallery"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":tokenId":      &types.AttributeValueMemberS{Value: tokenID},
			":camelGallery": &types.AttributeValueMemberBOOL{Value: true},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("dynamo scan: %w", err)
	}

	slog.DebugContext(ctx, "dynamo scan complete", "table", r.tableName, "count", len(result.Items))

	if len(result.Items) == 0 {
		return nil, nil
	}

	var event models.Event
	if err := attributevalue.UnmarshalMap(result.Items[0], &event); err != nil {
		return nil, fmt.Errorf("unmarshal event: %w", err)
	}
	return &event, nil
}
