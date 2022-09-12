package renderer

import (
	"os"

	"github.com/diurnalist/ourkino/internal/model"
	"github.com/jedib0t/go-pretty/v6/table"
)

type ConsoleRenderer struct{}

func (r ConsoleRenderer) Render(entries []model.ShowtimeEntry) error {
	t := table.NewWriter()
	t.SetOutputMirror(os.Stdout)
	t.AppendHeader(table.Row{"Showtime", "Film", "Theatre"})
	for _, entry := range entries {
		t.AppendRow([]interface{}{entry.Showtime.Showtime, entry.Film, entry.Theatre})
	}
	t.Render()
	return nil
}
