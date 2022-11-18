package model

import (
	"time"
)

type ShowtimeDetails struct {
	Description string
	ImageURL    string
}
type Showtime struct {
	Film     string
	When     time.Time
	Language string
	DeepLink string
	Details  ShowtimeDetails
}

type ShowtimeEntry struct {
	Theatre string
	Showtime
}
