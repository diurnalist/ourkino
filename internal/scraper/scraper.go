package scraper

import (
	"sync"
	"time"

	"github.com/diurnalist/ourkino/internal/model"
)

type Scraper interface {
	Scrape(chan<- []model.Showtime, []time.Time, *time.Location) error
}

var (
	driverMutex sync.RWMutex
	drivers     = make(map[string]func(map[string]any) (Scraper, error))
)

func Register(driver string, factory func(map[string]any) (Scraper, error)) {
	driverMutex.Lock()
	defer driverMutex.Unlock()
	//TODO: handle duplicate key
	drivers[driver] = factory
}

func Instance(driver string, driverArgs map[string]any) (Scraper, error) {
	return drivers[driver](driverArgs)
}
