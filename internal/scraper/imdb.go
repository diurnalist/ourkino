package scraper

import (
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"net/http"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/diurnalist/ourkino/internal/model"
)

const imdbBaseUrl = "https://imdb.com"
const imdbUserAgent = "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"

type imdbScraper struct {
	Permalink string
}

type imdbMovieTheater struct {
	Events []imdbEvent `json:"event"`
}

type imdbEvent struct {
	StartDate     string            `json:"startDate"`
	WorkPresented imdbWorkPresented `json:"workPresented"`
}

type imdbWorkPresented struct {
	Name  string `json:"name"`
	URL   string `json:"url"`
	Image string `json:"image"`
}

func (s imdbScraper) Scrape(ch chan<- []model.Showtime, dates []time.Time, tz *time.Location) error {
	showtimes := make([]model.Showtime, 0)

	for _, d := range dates {
		path := fmt.Sprintf("/showtimes/cinema/US/%v/US/60622/%v", s.Permalink, d.Format("2006-01-02"))

		req, err := http.NewRequest(http.MethodGet, imdbBaseUrl+path, nil)
		if err != nil {
			return err
		}

		headers := http.Header{}
		headers.Add("user-agent", imdbUserAgent)
		req.Header = headers

		res, err := http.DefaultClient.Do(req)
		if err != nil {
			return err
		}
		if res.StatusCode != 200 {
			return fmt.Errorf("http error %d", res.StatusCode)
		}

		defer res.Body.Close()
		doc, err := goquery.NewDocumentFromReader(res.Body)
		if err != nil {
			return err
		}

		var errs []error
		doc.Find("script[type='application/ld+json']").Each(func(i int, s *goquery.Selection) {
			var theater imdbMovieTheater
			err := json.Unmarshal([]byte(s.Text()), &theater)
			if err != nil {
				errs = append(errs, err)
				return
			}

			for _, event := range theater.Events {
				d, err := time.Parse("2006-01-02T15:04", event.StartDate)
				if err != nil {
					errs = append(errs, err)
					continue
				}

				// Decode HTML entities in the movie title
				decodedTitle := html.UnescapeString(event.WorkPresented.Name)

				showtimes = append(showtimes,
					model.Showtime{
						Film:      decodedTitle,
						When:      time.Date(d.Year(), d.Month(), d.Day(), d.Hour(), d.Minute(), 0, 0, tz),
						Language:  "",
						TicketURL: event.WorkPresented.URL,
					})
			}
		})
		if len(errs) > 0 {
			return errors.Join(errs...)
		}
	}

	ch <- showtimes

	return nil
}

func init() {
	Register("imdb", func(args map[string]any) (Scraper, error) {
		permalink, ok := args["permalink"].(string)
		if !ok {
			return nil, fmt.Errorf("missing required param: %v", "permalink")
		}
		return &imdbScraper{permalink}, nil
	})
}
