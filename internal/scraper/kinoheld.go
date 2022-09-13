package scraper

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/diurnalist/ourkino/internal/model"
)

type KinoheldScraper struct {
	ID int
}

const KinoheldBaseUrl = "https://www.kinoheld.de"

type KinoheldFlag struct {
	Name     string
	Category string
}

type KinoheldTime struct {
	ISOFull string
}

type KinoheldShow struct {
	Name      string
	MovieID   string
	URL       string
	Flags     []KinoheldFlag
	Beginning KinoheldTime
}

type KinoheldMovie struct {
	Name string
}

type KinoheldResponse struct {
	Shows  []KinoheldShow
	Movies map[string]KinoheldMovie
}

func (s KinoheldScraper) Scrape(ch chan<- []model.Showtime, dates []time.Time, tz *time.Location) error {
	var err error
	showtimes := make([]model.Showtime, 0)

	res, err := http.Get(fmt.Sprintf("%v/ajax/getShowsForCinemas?cinemaIds=%v", KinoheldBaseUrl, s.ID))
	if err != nil {
		return err
	} else if res.StatusCode != 200 {
		return fmt.Errorf("invalid status code from kinoheld: %v", res.StatusCode)
	}

	var kres KinoheldResponse

	defer res.Body.Close()
	err = json.NewDecoder(res.Body).Decode(&kres)
	if err != nil {
		log.Printf("kinoheld: failed to get shows for cinema %v", s.ID)
		// We treat this as an acceptable error for now; there is some interesting
		// thing about kinoheld's API that I need to figure out still. Some supposedly
		// valid cinemas return empty results on this endpoint.
		ch <- showtimes
		return nil
	}

	for _, kshow := range kres.Shows {
		showtime, err := time.Parse(time.RFC3339, kshow.Beginning.ISOFull)
		if err != nil {
			return err
		}

		dateInRange := false
		for _, date := range dates {
			date = date.In(tz)
			if showtime.Year() == date.Year() && showtime.Month() == date.Month() && showtime.Day() == date.Day() {
				dateInRange = true
				break
			}
		}
		if !dateInRange {
			continue
		}

		title := kshow.Name
		// Prefer movie name (sometimes shows are named after events/festivals)
		if kshow.MovieID != "" {
			movie, ok := kres.Movies[kshow.MovieID]
			if !ok {
				return fmt.Errorf("no matching movie found for show %v", kshow.Name)
			}
			title = movie.Name
		}

		deepLink := kshow.URL
		if deepLink != "" {
			deepLink = KinoheldBaseUrl + deepLink
		}

		var language string
		for _, flag := range kshow.Flags {
			if flag.Category == "language" {
				language = flag.Name
				break
			}
		}

		showtimes = append(showtimes, model.Showtime{
			Film: title, Showtime: showtime, Language: language, DeepLink: deepLink,
		})
	}

	ch <- showtimes

	return nil
}

func init() {
	Register("kinoheld", func(args map[string]any) (Scraper, error) {
		id, ok := args["id"].(float64)
		if !ok {
			return nil, fmt.Errorf("missing required param: %v", "id")
		}
		return &KinoheldScraper{int(id)}, nil
	})
}
