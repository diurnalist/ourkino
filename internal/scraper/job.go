package scraper

import (
	"context"
	"sort"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/diurnalist/ourkino/internal/config"
	"github.com/diurnalist/ourkino/internal/model"
)

// Job represents a scraping job that can be executed to fetch showtimes from multiple theatres
type Job struct {
	Theatres []config.TheatreConfig
	Days     int
	TimeLoc  *time.Location
}

// NewJob creates a new scraping job from the given configuration
func NewJob(theatres []config.TheatreConfig, days int, timeLoc *time.Location) *Job {
	return &Job{
		Theatres: theatres,
		Days:     days,
		TimeLoc:  timeLoc,
	}
}

// Execute runs the scraping job and returns the collected showtime entries
func (j *Job) Execute(ctx context.Context) ([]model.ShowtimeEntry, error) {
	if len(j.Theatres) < 1 {
		return nil, nil
	}

	// Calculate the date range
	date, dayRange := StartOfDay(time.Now().In(j.TimeLoc)), make([]time.Time, 1)
	dayRange[0] = date
	for i := 1; i < j.Days; i++ {
		date = date.Add(time.Hour * 24)
		dayRange = append(dayRange, date)
	}

	// Create channels for each theatre's results
	chanMap := make([]chan []model.Showtime, len(j.Theatres))
	for i := range j.Theatres {
		chanMap[i] = make(chan []model.Showtime, 1)
	}

	// Start scraping in parallel
	errs, _ := errgroup.WithContext(ctx)
	for i, theatreConf := range j.Theatres {
		i, theatreConf := i, theatreConf // Capture for goroutine
		errs.Go(func() error {
			scraper, err := Instance(theatreConf.Driver, theatreConf.DriverArgs)
			if err != nil {
				return err
			}
			return scraper.Scrape(chanMap[i], dayRange, j.TimeLoc)
		})
	}

	// Wait for all scrapers to complete
	if err := errs.Wait(); err != nil {
		return nil, err
	}

	// Collect and sort results
	entries := make([]model.ShowtimeEntry, 0)
	for i, theatreConf := range j.Theatres {
		for _, showtime := range <-chanMap[i] {
			entries = append(entries, model.ShowtimeEntry{
				Theatre:  theatreConf.Name,
				Showtime: showtime,
			})
		}
	}

	// Sort entries by showtime
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Showtime.When.Before(entries[j].Showtime.When)
	})

	return entries, nil
}
