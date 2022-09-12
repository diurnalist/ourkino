package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"sort"
	"sync"
	"time"

	"github.com/diurnalist/ourkino/internal/config"
	"github.com/diurnalist/ourkino/internal/model"
	"github.com/diurnalist/ourkino/internal/renderer"
	"github.com/diurnalist/ourkino/internal/scraper"
)

func StartOfDay(t time.Time) time.Time {
	year, month, day := t.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, t.Location())
}

func main() {
	var err error

	configFile := flag.String("config-file", "config.json", "path to a JSON config file")
	days := flag.Int("days", 2, "number of days to collect showtimes for, from today")
	output := flag.String("output", "html", "type of output to generate")
	flag.Parse()

	date, dayRange := StartOfDay(time.Now()), make([]time.Time, 1)
	dayRange[0] = date
	for i := 1; i < *days; i++ {
		date = date.Add(time.Hour * 24)
		dayRange = append(dayRange, date)
	}

	rawConfig, err := os.ReadFile(*configFile)
	check(err)

	conf := config.Config{}
	err = json.Unmarshal(rawConfig, &conf)
	check(err)

	timeLoc, err := time.LoadLocation(conf.Timezone)
	check(err)

	switch {
	case len(conf.Theatres) < 1:
		check(fmt.Errorf("no theatres defined in configuration"))
	}

	var wg sync.WaitGroup
	// Pass the set of all showtimes for a given theatre on a channel
	ch := make(chan []model.Showtime, len(conf.Theatres))
	for _, theatreConf := range conf.Theatres {
		wg.Add(1)
		scraper, err := scraper.Instance(theatreConf.Driver, theatreConf.DriverArgs)
		check(err)
		go func() {
			defer wg.Done()
			err := scraper.Scrape(ch, dayRange, timeLoc)
			check(err)
		}()
	}

	wg.Wait()

	entries := make([]model.ShowtimeEntry, 0)
	for _, theatreConf := range conf.Theatres {
		for _, showtime := range <-ch {
			entries = append(entries, model.ShowtimeEntry{Theatre: theatreConf.Name, Showtime: showtime})
		}
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Showtime.Showtime.Before(entries[j].Showtime.Showtime)
	})

	//TODO: use renderers here
	var r renderer.Renderer
	if *output == "html" {
		r = renderer.HtmlRenderer{}
	} else {
		r = renderer.ConsoleRenderer{}
	}
	err = r.Render(entries)
	check(err)
}

func check(e error) {
	if e != nil {
		panic(e)
	}
}
