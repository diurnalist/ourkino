package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/diurnalist/ourkino/internal/config"
	"github.com/diurnalist/ourkino/internal/renderer"
	"github.com/diurnalist/ourkino/internal/scraper"
)

func main() {
	var err error

	configFile := flag.String("config-file", "config.json", "path to a JSON config file")
	output := flag.String("output", "html", "type of output to generate")
	days := flag.Int("days", 2, "number of days to collect showtimes for, from today")
	flag.Parse()

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

	if conf.Days == 0 {
		conf.Days = *days
	}

	// Create and execute the scraping job
	job := scraper.NewJob(conf.Theatres, conf.Days, timeLoc)
	entries, err := job.Execute(context.Background())
	check(err)

	// Render the results
	var r renderer.Renderer
	switch *output {
	case "html":
		r = renderer.HtmlRenderer{}
	default:
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
