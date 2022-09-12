package renderer

import "github.com/diurnalist/ourkino/internal/model"

type HtmlRenderer struct{}

type ShowtimeTemplateVars struct {
	ShowtimeISO     string
	ShowtimeDisplay string
	Search          string
	Film            string
	Language        string
	DeepLink        string
}

type TemplateVars struct {
	Today           []ShowtimeTemplateVars
	Tomorrow        []ShowtimeTemplateVars
	GoogleAnalytics string
}

func (r HtmlRenderer) Render(entries []model.ShowtimeEntry) error {
	mapped := make([]ShowtimeTemplateVars, len(entries))
	for i, entry := range entries {
		mapped[i] = ShowtimeTemplateVars{
			"", "", "", entry.Film, entry.Language, entry.DeepLink,
		}
	}
	return nil
}
