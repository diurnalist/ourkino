package renderer

import "github.com/diurnalist/ourkino/internal/model"

type Renderer interface {
	Render([]model.ShowtimeEntry) error
}
