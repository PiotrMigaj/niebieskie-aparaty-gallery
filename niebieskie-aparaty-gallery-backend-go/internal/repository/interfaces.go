package repository

import (
	"context"

	"github.com/pmigaj/niebieskie-aparaty-gallery-backend/internal/models"
)

type EventRepository interface {
	FindByTokenID(ctx context.Context, tokenID string) (*models.Event, error)
}

type GalleryRepository interface {
	FindByEventID(ctx context.Context, eventID string) ([]models.GalleryItem, error)
}
