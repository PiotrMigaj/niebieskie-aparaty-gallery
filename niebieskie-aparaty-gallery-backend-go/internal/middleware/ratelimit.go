package middleware

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"time"
)

type RateLimiter struct {
	mu    sync.Mutex
	date  time.Time
	count int
	limit int
}

func NewRateLimiter(limit int) *RateLimiter {
	return &RateLimiter{
		date:  time.Now().UTC().Truncate(24 * time.Hour),
		limit: limit,
	}
}

func (rl *RateLimiter) check() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	today := time.Now().UTC().Truncate(24 * time.Hour)
	if !today.Equal(rl.date) {
		slog.Debug("rate limiter reset", "previousDate", rl.date, "newDate", today)
		rl.date = today
		rl.count = 0
	}

	if rl.count >= rl.limit {
		slog.Warn("daily rate limit reached", "count", rl.count, "limit", rl.limit)
		return false
	}
	rl.count++
	return true
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !rl.check() {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Rate limit exceeded"})
			return
		}
		next.ServeHTTP(w, r)
	})
}
