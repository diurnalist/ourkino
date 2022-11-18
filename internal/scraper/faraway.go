package scraper

import (
	"fmt"
	"time"

	"github.com/diurnalist/ourkino/internal/model"
)

type farawayScraper struct {
	Location string
}

func (s farawayScraper) Scrape(ch chan<- []model.Showtime, dates []time.Time, tz *time.Location) error {
	showtimes := make([]model.Showtime, 0)

	ch <- showtimes

	return nil
}

func init() {
	Register("faraway", func(args map[string]any) (Scraper, error) {
		location, ok := args["location"].(string)
		if !ok {
			return nil, fmt.Errorf("missing required param: %v", "location")
		}

		return &farawayScraper{location}, nil
	})
}
