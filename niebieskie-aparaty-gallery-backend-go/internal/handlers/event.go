package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/pmigaj/niebieskie-aparaty-gallery-backend/internal/apierror"
	"github.com/pmigaj/niebieskie-aparaty-gallery-backend/internal/repository"
)

type EventHandler struct {
	repo repository.EventRepository
}

func NewEventHandler(repo repository.EventRepository) *EventHandler {
	return &EventHandler{repo: repo}
}

func (h *EventHandler) GetEvent(w http.ResponseWriter, r *http.Request) {
	tokenID := chi.URLParam(r, "tokenId")
	ctx := r.Context()

	event, err := h.repo.FindByTokenID(ctx, tokenID)
	if err != nil {
		apierror.WriteJSON(w, err)
		return
	}
	if event == nil {
		apierror.WriteJSON(w, apierror.ErrNotFound)
		return
	}

	slog.InfoContext(ctx, "event found", "eventId", event.EventID, "username", event.Username)

	if event.TokenIDCreatedAt == nil {
		apierror.WriteJSON(w, fmt.Errorf("missing tokenIdCreatedAt"))
		return
	}
	if event.TokenIDValidDays == nil {
		apierror.WriteJSON(w, fmt.Errorf("missing tokenIdValidDays"))
		return
	}

	createdAt, err := time.Parse("2006-01-02", *event.TokenIDCreatedAt)
	if err != nil {
		apierror.WriteJSON(w, fmt.Errorf("invalid tokenIdCreatedAt: %w", err))
		return
	}

	validDays, err := strconv.Atoi(*event.TokenIDValidDays)
	if err != nil {
		apierror.WriteJSON(w, fmt.Errorf("invalid tokenIdValidDays: %w", err))
		return
	}

	expiry := createdAt.AddDate(0, 0, validDays)
	today := time.Now().UTC().Truncate(24 * time.Hour)

	if today.After(expiry) {
		slog.WarnContext(ctx, "token expired", "expiry", expiry.Format("2006-01-02"), "today", today.Format("2006-01-02"))
		apierror.WriteJSON(w, apierror.ErrTokenExpired)
		return
	}

	slog.InfoContext(ctx, "returning event", "eventId", event.EventID)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(event)
}
