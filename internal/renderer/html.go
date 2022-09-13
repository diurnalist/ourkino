package renderer

import (
	"os"
	"strings"
	"text/template"
	"time"

	"github.com/diurnalist/ourkino/internal/model"
)

type HtmlRenderer struct{}

type ShowtimeTemplateVars struct {
	Theatre         string
	Film            string
	ShowtimeISO     string
	ShowtimeDisplay string
	Language        string
	Search          string
	DeepLink        string
}

type TemplateVars struct {
	ByTime          map[time.Time][]ShowtimeTemplateVars
	GoogleAnalytics string
}

func (r HtmlRenderer) Render(entries []model.ShowtimeEntry) error {
	var err error
	t, err := template.ParseFiles("public/index.tmpl")
	if err != nil {
		return err
	}

	buckets := make(map[time.Time][]ShowtimeTemplateVars, 1)
	bucketTime := time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC)
	for _, entry := range entries {
		showtime := entry.Showtime.Showtime
		if showtime.Sub(bucketTime) > (time.Hour * 27) {
			bucketTime = time.Date(showtime.Year(), showtime.Month(), showtime.Day(), 0, 0, 0, 0, showtime.Location())
			// Start new bucket
			buckets[bucketTime] = make([]ShowtimeTemplateVars, 0)
		}
		showtimeIso := showtime.Format(time.RFC3339)
		showtimeDisplay := showtime.Format("15:04")
		searchIndex := strings.ToLower(strings.Join(append(
			strings.Fields(entry.Film),
			strings.Fields(entry.Theatre)...,
		), " "))
		buckets[bucketTime] = append(buckets[bucketTime], ShowtimeTemplateVars{
			Theatre: entry.Theatre, Film: entry.Film, ShowtimeISO: showtimeIso,
			ShowtimeDisplay: showtimeDisplay, Language: entry.Language, Search: searchIndex,
			DeepLink: entry.DeepLink,
		})
	}

	err = os.MkdirAll("public", os.FileMode(int32(0755)))
	if err != nil {
		return err
	}

	outFile, err := os.OpenFile("public/index.html", os.O_RDWR|os.O_CREATE|os.O_TRUNC, os.FileMode(int32(0644)))
	defer outFile.Close()
	if err != nil {
		return err
	}

	err = t.Execute(outFile, TemplateVars{buckets, ""})
	if err != nil {
		return err
	}

	return nil
}
