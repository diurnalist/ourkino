package scraper

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/diurnalist/ourkino/internal/model"
	v8 "rogchap.com/v8go"
)

type farawayScraper struct {
	Permalink string
}

type FarawayMovieData = map[string][]FarawayListing

type FarawayListing struct {
	Url           string         `json:"url"`
	ImagePortrait string         `json:"image-portrait"`
	Title         string         `json:"title"`
	Times         []FarawayEvent `json:"times"`
}

type FarawayEvent struct {
	Time        string `json:"time"`
	BookingLink string `json:"bookingLink"`
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

	v8ctx := v8.NewContext()

	url := fmt.Sprintf("https://www.farawayentertainment.com/%s", s.Permalink)
	res, err := http.Get(url)
	if err != nil {
		return err
	}

	defer res.Body.Close()
	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return err
	}

	movieData := make(FarawayMovieData)
	var jsErr error
	doc.Find("script").EachWithBreak(func(i int, s *goquery.Selection) bool {
		if !strings.Contains(s.Text(), "movieData") {
			return true
		}

		if _, jsErr := v8ctx.RunScript(s.Text(), "scrape.js"); jsErr != nil {
			return false
		}

		val, jsErr := v8ctx.RunScript("movieData", "scrape.js")
		if jsErr != nil {
			return false
		}

		valJson, jsErr := v8.JSONStringify(v8ctx, val)
		if jsErr != nil {
			return false
		}

		json.Unmarshal([]byte(valJson), &movieData)

		return false
	})
	if jsErr != nil {
		fmt.Println(jsErr)
		return jsErr
	}

	for _, d := range dates {
		key := d.Format("2006-01-02")
		for _, movie := range movieData[key] {
			for _, movietime := range movie.Times {
				showtimeTime, err := time.Parse("3:04pm", movietime.Time)
				if err != nil {
					fmt.Println(err)
					continue
				}
				showtime := time.Date(d.Year(), d.Month(), d.Day(), showtimeTime.Hour(), showtimeTime.Minute(), 0, 0, tz)
				showtimes = append(showtimes, model.Showtime{
					Film:     movie.Title,
					When:     showtime,
					DeepLink: "",
					Details: model.ShowtimeDetails{
						Description: "",
						ImageURL:    movie.ImagePortrait,
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
		permalink, ok := args["permalink"].(string)
		if !ok {
			return nil, fmt.Errorf("missing required param: %v", "permalink")
		}

		return &farawayScraper{permalink}, nil
	})
}
