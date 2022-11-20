package scraper

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/diurnalist/ourkino/internal/model"
)

type farawayScraper struct {
	Location string
}

type FarawayRepertoireEvent struct {
	EventTimetable string `json:"event_timetable"`
}

type FarawayRepertoireEventGroup struct {
	EventsCollection []FarawayRepertoireEvent `json:"events_collection"`
}

type FarawayRepertoire struct {
	Title       string
	Description string
	Picture1    string                        `json:"picture_1"`
	EventGroup  []FarawayRepertoireEventGroup `json:"event_group"`
}

type FarawayRepertoireWrapper struct {
	Data []FarawayRepertoire
}

func (s farawayScraper) Scrape(ch chan<- []model.Showtime, dates []time.Time, tz *time.Location) error {
	showtimes := make([]model.Showtime, 0)

	for _, date := range dates {
		reqUrl := "https://faraway.intensify-solutions.com/embed/ajaxGetRepertoire"
		data := url.Values{}
		data.Set("location", s.Location)
		data.Set("date", date.Format("2006-01-02"))
		res, err := http.Post(reqUrl, "application/x-www-form-urlencoded", strings.NewReader(data.Encode()))
		if err != nil {
			return err
		}

		var repertoire FarawayRepertoireWrapper
		defer res.Body.Close()
		json.NewDecoder(res.Body).Decode(&repertoire)

		for _, rData := range repertoire.Data {
			if len(rData.EventGroup) != 1 {
				//Some entries have 0-length event groups; these can be ignored.
				continue
			}

			for _, event := range rData.EventGroup[0].EventsCollection {
				timetableDate, err := time.Parse("2006-01-02 15:04", event.EventTimetable)
				if err != nil {
					return err
				}
				showtime := time.Date(
					timetableDate.Year(), timetableDate.Month(), timetableDate.Day(),
					timetableDate.Hour(), timetableDate.Minute(), 0, 0, tz)

				showtimes = append(showtimes, model.Showtime{
					Film:     rData.Title,
					When:     showtime,
					Language: "",
					DeepLink: "",
					Details: model.ShowtimeDetails{
						Description: rData.Description,
						ImageURL:    "https://faraway.intensify-solutions.com" + rData.Picture1,
					},
				})
			}
		}
	}

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
