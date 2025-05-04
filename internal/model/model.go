package model

import (
	"time"
)

type Showtime struct {
	Film      string
	When      time.Time
	Language  string
	TicketURL string
}

type ShowtimeEntry struct {
	Theatre string
	Showtime
}
