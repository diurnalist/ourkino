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

const YorckBaseUrl = "https://yorck.de"

type yorckScraper struct {
	// Canonical theatre name in Yorck
	Title string
}

type YorckBuildInfo struct {
	BuildID string
}

type YorckCinema struct {
	Name string
}

type YorckCinemaFields struct {
	Fields YorckCinema
}

type YorckSession struct {
	StartTime string
	Formats   []string
	Cinema    YorckCinemaFields
}

type YorckSessionFields struct {
	Fields YorckSession
}

type YorckFilm struct {
	Title    string
	Sessions []YorckSessionFields
}

type YorckFilmFields struct {
	Fields YorckFilm
}

type YorckPageProps struct {
	Films []YorckFilmFields
}

type YorckFilmWrapper struct {
	PageProps YorckPageProps
}

func (s yorckScraper) Scrape(ch chan<- []model.Showtime, dates []time.Time, tz *time.Location) error {
	var err error

	showtimes := make([]model.Showtime, 0)

	res, err := http.Get(YorckBaseUrl)
	if err != nil {
		return err
	}

	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return err
	}

	// Find the review items
	node := doc.Find("#__NEXT_DATA__").First()
	var buildInfo YorckBuildInfo
	err = json.NewDecoder(strings.NewReader(node.Text())).Decode(&buildInfo)
	if err != nil {
		return err
	}

	filmRes, err := http.Get(fmt.Sprintf("%v/_next/data/%v/de/filme.json", YorckBaseUrl, buildInfo.BuildID))
	if err != nil {
		return err
	}

	var yres YorckFilmWrapper
	err = json.NewDecoder(filmRes.Body).Decode(&yres)
	if err != nil {
		return err
	}

	for _, film := range yres.PageProps.Films {
		for _, session := range film.Fields.Sessions {
			if session.Fields.Cinema.Fields.Name == s.Title {
				showtime, err := time.Parse(time.RFC3339, session.Fields.StartTime)
				if err != nil {
					return err
				}

				if !DateInRange(showtime, dates) {
					continue
				}

				showtimes = append(showtimes, model.Showtime{
					Film: film.Fields.Title, When: showtime,
					Language: session.Fields.Formats[0], TicketURL: "",
				})
			}
		}
	}

	ch <- showtimes

	return nil
}

func init() {
	Register("yorck", func(args map[string]any) (Scraper, error) {
		title, ok := args["title"].(string)
		if !ok {
			return nil, fmt.Errorf("missing required param: %v", "title")
		}
		return &yorckScraper{title}, nil
	})
}
