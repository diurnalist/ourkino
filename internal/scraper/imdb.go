package scraper

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/PuerkitoBio/goquery"
	"github.com/diurnalist/ourkino/internal/model"
)

const baseUrl = "https://imdb.com"

type imdbScraper struct {
	Permalink string
}

func (s imdbScraper) Scrape(ch chan<- []model.Showtime, dates []time.Time, tz *time.Location) error {
	showtimes := make([]model.Showtime, 0)

	for _, d := range dates {
		path := fmt.Sprintf("/showtimes/cinema/US/%v/%v", s.Permalink, d.Format("2006-01-02"))
		// TODO: more idiomatic way?
		res, err := http.Get(baseUrl + path)
		if err != nil {
			return err
		}

		defer res.Body.Close()
		doc, err := goquery.NewDocumentFromReader(res.Body)
		if err != nil {
			return err
		}

		re := regexp.MustCompile(`.*/title/(tt[0-9]+).*`)

		// Find the review items
		doc.Find(".article.st [itemtype='http://schema.org/Movie']").Each(func(i int, s *goquery.Selection) {
			title := strings.TrimSpace(s.Find("[itemprop=name]").Text())
			deepLink, _ := s.Find("[itemprop=url]").Attr("href")
			match := re.FindStringSubmatch(deepLink)
			if match != nil {
				deepLink = fmt.Sprintf("%v/title/%v", baseUrl, match[1])
			} else if len(deepLink) > 0 {
				deepLink = baseUrl + deepLink
			}

			rawShowtimes := strings.Fields(strings.ToLower(s.Find(".showtimes").Text()))
			ampm := "am"
			times := make([]time.Time, 0)
			for _, token := range rawShowtimes {
				runeSeq := []rune(token)
				switch {
				case token == "pm":
					ampm = "pm"
					// Reprocess the last one to be PM instead of AM
					times[len(times)-1] = times[len(times)-1].Add(time.Hour * 12)
				case unicode.IsDigit(runeSeq[0]):
					showtime, _ := time.Parse("3:04pm", token+ampm)
					// TODO: handle error properly here (early quit?)
					times = append(times,
						time.Date(d.Year(), d.Month(), d.Day(), showtime.Hour(), showtime.Minute(), 0, 0, tz))
				}
			}

			for _, time := range times {
				showtimes = append(showtimes,
					model.Showtime{Film: title, When: time, Language: "", DeepLink: deepLink})
			}
		})
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
