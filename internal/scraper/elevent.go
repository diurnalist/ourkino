package scraper

import (
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/diurnalist/ourkino/internal/model"
)

type eleventScraper struct {
	Permalink string
	VenueIDs  []string
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

	url := fmt.Sprintf("https://www.goelevent.com/%v/e/List", s.Permalink)
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

	var venueIds = s.VenueIDs

	doc.Find("#event-search-list-module").Each(func(i int, s *goquery.Selection) {
		modelStr, exists := s.Attr("model")
		var eventList = EleventEventListing{}
		if exists {
			json.NewDecoder(strings.NewReader(modelStr)).Decode(&eventList)

			for _, event := range eventList.Events {
				for _, showtime := range event.Schedule {
					if !slices.Contains(venueIds, strconv.FormatInt(int64(showtime.VenueID), 10)) {
						continue
					}

					startDateTime, err := time.Parse("2006-01-02T15:04:05", showtime.StartDateTime)
					showtime := time.Date(
						startDateTime.Year(), startDateTime.Month(), startDateTime.Day(),
						startDateTime.Hour(), startDateTime.Minute(), 0, 0, tz)
					if err != nil {
						fmt.Println(err)
						continue
					}

					if !DateInRange(showtime, dates) {
						continue
					}

					showtimes = append(showtimes, model.Showtime{
						Film:      event.EventName,
						When:      showtime,
						Language:  "",
						TicketURL: "",
					})
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
		rawVenueIDs, ok := args["venueIDs"].([]interface{})
		if !ok {
			return nil, fmt.Errorf("missing required param: %v", "venueIDs")
		}
		venueIDs := make([]string, 1)
		for _, v := range rawVenueIDs {
			venueID, ok := v.(string)
			if !ok {
				return nil, fmt.Errorf("malformed venueID, must be string")
			}
			venueIDs = append(venueIDs, venueID)
		}

		return &eleventScraper{permalink, venueIDs}, nil
	})
}
