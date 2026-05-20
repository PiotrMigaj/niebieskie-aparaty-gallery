package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AWSRegion          string
	AWSAccessKeyID     string
	AWSSecretAccessKey string
	EventsTableName    string
	GalleriesTableName string
	Port               string
	RateLimiting       int
	LogLevel           string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	rateLimiting := 100
	if v := os.Getenv("RATE_LIMITING"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			rateLimiting = n
		}
	}
	if rateLimiting < 1 {
		rateLimiting = 1
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}

	eventsTable := os.Getenv("EVENTS_TABLE_NAME")
	if eventsTable == "" {
		eventsTable = "Events"
	}

	galleriesTable := os.Getenv("GALLERIES_TABLE_NAME")
	if galleriesTable == "" {
		galleriesTable = "GalleriesCamel"
	}

	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		logLevel = "info"
	}

	return &Config{
		AWSRegion:          os.Getenv("AWS_REGION"),
		AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
		AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
		EventsTableName:    eventsTable,
		GalleriesTableName: galleriesTable,
		Port:               port,
		RateLimiting:       rateLimiting,
		LogLevel:           logLevel,
	}, nil
}
