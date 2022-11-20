package scraper

import "time"

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
