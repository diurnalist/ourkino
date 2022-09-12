package model

import (
	"time"
)

type Showtime struct {
	Film     string
	Showtime time.Time
	Language string
	DeepLink string
}

type ShowtimeEntry struct {
	Theatre string
	Showtime
}
