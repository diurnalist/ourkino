package renderer

import (
	"os"
	"text/template"

	"github.com/diurnalist/ourkino/internal/model"
)

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
	var err error
	t, err := template.ParseFiles("public/index.tmpl")
	if err != nil {
		return err
	}

	mapped := make([]ShowtimeTemplateVars, len(entries))
	for i, entry := range entries {
		mapped[i] = ShowtimeTemplateVars{
			"", "", "", entry.Film, entry.Language, entry.DeepLink,
		}
	}

	outFile, err := os.OpenFile("dist/index.html", os.O_RDWR|os.O_CREATE|os.O_TRUNC, os.FileMode(int32(0755)))
	defer outFile.Close()
	err = t.Execute(outFile, TemplateVars{})
	if err != nil {
		return err
	}

	return nil
}
