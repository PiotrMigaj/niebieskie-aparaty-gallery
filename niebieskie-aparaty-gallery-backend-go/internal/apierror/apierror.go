package apierror

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
)

var (
	ErrNotFound     = errors.New("Event not found")
	ErrTokenExpired = errors.New("Token has expired")
)

type errorBody struct {
	Error string `json:"error"`
}

func WriteJSON(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		WriteJSONWithStatus(w, http.StatusNotFound, ErrNotFound.Error())
	case errors.Is(err, ErrTokenExpired):
		WriteJSONWithStatus(w, http.StatusBadRequest, ErrTokenExpired.Error())
	default:
		slog.Error("internal error", "error", err)
		WriteJSONWithStatus(w, http.StatusInternalServerError, "Internal server error")
	}
}

func WriteJSONWithStatus(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(errorBody{Error: message})
}
