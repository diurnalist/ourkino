package scraper

import "time"

// StartOfDay returns the time truncated to the start of the day
func StartOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func DateInRange(date time.Time, dateRange []time.Time) bool {
	dateInRange := false
	for _, target := range dateRange {
		target = target.In(date.Location())
		if date.Year() == target.Year() && date.Month() == target.Month() && date.Day() == target.Day() {
			dateInRange = true
			break
		}
	}
	return dateInRange
}
