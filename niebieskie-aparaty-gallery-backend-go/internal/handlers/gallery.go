package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/pmigaj/niebieskie-aparaty-gallery-backend/internal/apierror"
	"github.com/pmigaj/niebieskie-aparaty-gallery-backend/internal/models"
	"github.com/pmigaj/niebieskie-aparaty-gallery-backend/internal/repository"
)

type GalleryHandler struct {
	repo repository.GalleryRepository
}

func NewGalleryHandler(repo repository.GalleryRepository) *GalleryHandler {
	return &GalleryHandler{repo: repo}
}

func (h *GalleryHandler) GetGallery(w http.ResponseWriter, r *http.Request) {
	eventID := chi.URLParam(r, "eventId")
	ctx := r.Context()

	items, err := h.repo.FindByEventID(ctx, eventID)
	if err != nil {
		apierror.WriteJSON(w, err)
		return
	}

	slog.InfoContext(ctx, "returning gallery", "eventId", eventID, "count", len(items))

	if items == nil {
		items = []models.GalleryItem{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(items)
}
