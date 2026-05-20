package repository

import (
	"context"
	"fmt"
	"log/slog"
	"sort"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/pmigaj/niebieskie-aparaty-gallery-backend/internal/models"
)

type DynamoGalleryRepository struct {
	client    *dynamodb.Client
	tableName string
}

func NewDynamoGalleryRepository(client *dynamodb.Client, tableName string) *DynamoGalleryRepository {
	return &DynamoGalleryRepository{client: client, tableName: tableName}
}

func (r *DynamoGalleryRepository) FindByEventID(ctx context.Context, eventID string) ([]models.GalleryItem, error) {
	slog.DebugContext(ctx, "dynamo scan start", "table", r.tableName, "eventId", eventID)

	var items []models.GalleryItem
	var lastKey map[string]types.AttributeValue

	for {
		input := &dynamodb.ScanInput{
			TableName:        aws.String(r.tableName),
			FilterExpression: aws.String("eventId = :eventId"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":eventId": &types.AttributeValueMemberS{Value: eventID},
			},
		}
		if len(lastKey) > 0 {
			input.ExclusiveStartKey = lastKey
		}

		result, err := r.client.Scan(ctx, input)
		if err != nil {
			return nil, fmt.Errorf("dynamo scan: %w", err)
		}

		slog.DebugContext(ctx, "dynamo scan page", "table", r.tableName, "pageCount", len(result.Items))

		for _, raw := range result.Items {
			var gi models.GalleryItem
			if err := attributevalue.UnmarshalMap(raw, &gi); err != nil {
				return nil, fmt.Errorf("unmarshal gallery item: %w", err)
			}
			items = append(items, gi)
		}

		lastKey = result.LastEvaluatedKey
		if len(lastKey) == 0 {
			break
		}
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].FileName < items[j].FileName
	})

	slog.DebugContext(ctx, "dynamo scan complete", "table", r.tableName, "total", len(items))
	return items, nil
}
