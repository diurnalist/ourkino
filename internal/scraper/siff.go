package scraper

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/diurnalist/ourkino/internal/model"
)

type siffScraper struct {
	Permalink string
}

type SiffScreening struct {
	EventName   string `json:"EventName"`
	ShowtimeRaw string `json:"Showtime"`
}

func (ss *SiffScreening) Showtime(tz *time.Location) (time.Time, error) {
	tsStr := strings.TrimSuffix(strings.TrimPrefix(ss.ShowtimeRaw, "/Date("), ")/")
	ts, err := strconv.ParseInt(tsStr, 10, 64)
	if err != nil {
		return time.Unix(0, 0), err
	}
	return time.Unix(ts/1000, 0).In(tz), nil
}

func (s siffScraper) Scrape(ch chan<- []model.Showtime, dates []time.Time, tz *time.Location) error {
	showtimes := make([]model.Showtime, 0)

	for i := range dates {
		url := fmt.Sprintf("https://www.siff.net/cinema/cinema-venues/%s?day=%v", s.Permalink, i)
		res, err := http.Get(url)
		if err != nil {
			return err
		}

		defer res.Body.Close()
		doc, err := goquery.NewDocumentFromReader(res.Body)
		if err != nil {
			return err
		}

		doc.Find("[data-screening]").Each(func(i int, s *goquery.Selection) {
			screeningData, _ := s.Attr("data-screening")
			var screening SiffScreening
			if err := json.Unmarshal([]byte(screeningData), &screening); err != nil {
				fmt.Println(err)
				return
			}

			showtimeWhen, err := screening.Showtime(tz)
			if err != nil {
				fmt.Println(err)
				return
			}
			showtimes = append(showtimes, model.Showtime{
				Film: screening.EventName,
				When: showtimeWhen,
			})
		})
	}

	ch <- showtimes

	return nil
}

func init() {
	Register("siff", func(args map[string]any) (Scraper, error) {
		permalink, ok := args["permalink"].(string)
		if !ok {
			return nil, fmt.Errorf("missing required param: %v", "permalink")
		}

		return &siffScraper{permalink}, nil
	})
}
