package scraper

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/diurnalist/ourkino/internal/model"
)

type eleventScraper struct {
	Permalink string
	VenueID   string
}

type EleventShowtime struct {
	StartDateTime string
	VenueID       int
}

type EleventEvent struct {
	EventName     string
	Synopsis      string
	EventImageURL string
	Schedule      []EleventShowtime
}

type EleventEventListing struct {
	Events []EleventEvent
}

func (s eleventScraper) Scrape(ch chan<- []model.Showtime, dates []time.Time, tz *time.Location) error {
	showtimes := make([]model.Showtime, 0)

	url := fmt.Sprintf("https://www.goelevent.com/%v/e/List?v=%v", s.Permalink, s.VenueID)
	// TODO: more idiomatic way?
	res, err := http.Get(url)
	if err != nil {
		return err
	}

	defer res.Body.Close()
	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return err
	}

	doc.Find("#event-search-list-module").Each(func(i int, s *goquery.Selection) {
		modelStr, exists := s.Attr("model")
		var eventList = EleventEventListing{}
		if exists {
			json.NewDecoder(strings.NewReader(modelStr)).Decode(&eventList)

			for _, event := range eventList.Events {
				for _, showtime := range event.Schedule {
					when, err := time.Parse("2006-01-02T15:04:05", showtime.StartDateTime)
					localizedWhen := time.Date(when.Year(), when.Month(), when.Day(), when.Hour(), when.Minute(), 0, 0, tz)
					if err != nil {
						fmt.Print(err)
						continue
					}

					// TODO: shared with kinoheld, possibly make a helper.
					dateInRange := false
					for _, date := range dates {
						date = date.In(tz)
						if localizedWhen.Year() == date.Year() && localizedWhen.Month() == date.Month() && localizedWhen.Day() == date.Day() {
							dateInRange = true
							break
						}
					}
					if !dateInRange {
						continue
					}

					showtimes = append(showtimes, model.Showtime{
						Film: event.EventName, When: localizedWhen, Language: "", DeepLink: "",
						Details: model.ShowtimeDetails{
							Description: event.Synopsis,
							ImageURL:    event.EventImageURL,
						}})
				}
			}
		}
	})

	ch <- showtimes

	return nil
}

func init() {
	Register("elevent", func(args map[string]any) (Scraper, error) {
		permalink, ok := args["permalink"].(string)
		if !ok {
			return nil, fmt.Errorf("missing required param: %v", "permalink")
		}
		venueID, ok := args["venueID"].(string)
		if !ok {
			return nil, fmt.Errorf("missing required param: %v", "venueID")
		}

		return &eleventScraper{permalink, venueID}, nil
	})
}
