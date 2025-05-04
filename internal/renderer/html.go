package renderer

import (
	"context"
	"os"
	"strings"
	"sync"
	"text/template"
	"time"

	"github.com/diurnalist/ourkino/internal/model"
	"github.com/diurnalist/ourkino/internal/tmdb"
	"golang.org/x/sync/errgroup"
)

// HtmlRenderer renders showtimes as an HTML page with movie metadata
type HtmlRenderer struct {
	tmdb tmdb.TMDB
}

// NewHtmlRenderer creates a new HTML renderer with TMDB integration
func NewHtmlRenderer(tmdbClient tmdb.TMDB) *HtmlRenderer {
	return &HtmlRenderer{
		tmdb: tmdbClient,
	}
}

type ShowtimeTemplateVars struct {
	Theatre         string
	Film            string
	ShowtimeISO     string
	ShowtimeDisplay string
	Language        string
	SearchIndex     string
	DetailsIndex    string
	TicketURL       string
	TMDBID          string
}

type MovieMetadata struct {
	Title            string
	Overview         string
	PosterPath       string
	ReleaseDate      string
	Runtime          int
	OriginalLanguage string
	Credits          tmdb.MovieCredits
}

// MovieKey represents a unique movie by its title and release year
type MovieKey struct {
	Title       string
	ReleaseYear string // Empty string if unknown
}

type DetailsTemplateVars struct {
	Film      string
	Metadata  *MovieMetadata
	TicketURL string
}

type TemplateVars struct {
	ByTime          map[time.Time][]ShowtimeTemplateVars
	Details         map[string]DetailsTemplateVars
	Movies          map[MovieKey]*MovieMetadata
	GoogleAnalytics string
}

// preprocess fetches movie metadata for all unique movies
func (r *HtmlRenderer) preprocess(ctx context.Context, entries []model.ShowtimeEntry) (map[MovieKey]*MovieMetadata, error) {
	// First, build a map of unique movies
	movies := make(map[MovieKey]*MovieMetadata)
	var moviesMutex sync.Mutex // Protect concurrent map access

	for _, entry := range entries {
		// TODO: In the future, we could extract release year from the movie title or other sources
		key := MovieKey{
			Title:       entry.Film,
			ReleaseYear: "", // For now, we don't have release year information
		}
		movies[key] = nil // Initialize with nil metadata
	}

	// Create an errgroup for parallel processing
	g, ctx := errgroup.WithContext(ctx)

	// Now fetch metadata for each unique movie in parallel
	for key := range movies {
		key := key // Create new variable for goroutine
		g.Go(func() error {
			// First search for the movie
			results, err := r.tmdb.SearchMovies(ctx, key.Title, tmdb.SearchOptions{})
			if err != nil {
				return err
			}

			// If we have results, get the full details of the most popular one
			if len(results) > 0 {
				movie, err := r.tmdb.GetMovie(ctx, results[0].ID)
				if err != nil {
					return err
				}

				metadata := &MovieMetadata{
					Title:            movie.Title,
					Overview:         movie.Overview,
					PosterPath:       movie.PosterPath,
					ReleaseDate:      movie.ReleaseDate,
					Runtime:          movie.Runtime,
					OriginalLanguage: movie.OriginalLanguage,
				}

				// Safely update the map
				moviesMutex.Lock()
				movies[key] = metadata
				moviesMutex.Unlock()
			}

			return nil
		})
	}

	// Wait for all goroutines to complete and check for errors
	if err := g.Wait(); err != nil {
		return nil, err
	}

	return movies, nil
}

func (r *HtmlRenderer) Render(entries []model.ShowtimeEntry) error {
	// Preprocess to fetch movie metadata
	movies, err := r.preprocess(context.Background(), entries)
	if err != nil {
		return err
	}

	t, err := template.ParseFiles("public/index.tmpl")
	if err != nil {
		return err
	}

	buckets := make(map[time.Time][]ShowtimeTemplateVars, 1)
	bucketTime := time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC)

	details := make(map[string]DetailsTemplateVars, 1)

	for _, entry := range entries {
		showtime := entry.Showtime.When
		if showtime.Sub(bucketTime) > (time.Hour * 27) {
			bucketTime = time.Date(showtime.Year(), showtime.Month(), showtime.Day(), 0, 0, 0, 0, showtime.Location())
			// Start new bucket
			buckets[bucketTime] = make([]ShowtimeTemplateVars, 0)
		}
		showtimeIso := showtime.Format(time.RFC3339)
		showtimeDisplay := showtime.Format("15:04")
		filmKey := strings.ToLower(strings.Join(strings.Fields(entry.Film), " "))
		theatreKey := strings.ToLower(strings.Join(strings.Fields(entry.Theatre), " "))
		searchIndex := filmKey + " " + theatreKey

		// Create the movie key for this entry
		movieKey := MovieKey{
			Title:       entry.Film,
			ReleaseYear: "", // For now, we don't have release year information
		}

		// Get the TMDB ID if we have metadata
		var tmdbID string
		if metadata := movies[movieKey]; metadata != nil {
			// TODO: In the future, we could store the TMDB ID in the metadata
			// For now, we'll just use an empty string
		}

		buckets[bucketTime] = append(buckets[bucketTime], ShowtimeTemplateVars{
			Theatre: entry.Theatre, Film: entry.Film, ShowtimeISO: showtimeIso,
			ShowtimeDisplay: showtimeDisplay, Language: entry.Language,
			SearchIndex: searchIndex, DetailsIndex: filmKey,
			TicketURL: entry.Showtime.TicketURL, TMDBID: tmdbID,
		})

		details[filmKey] = DetailsTemplateVars{
			Film:      entry.Film,
			Metadata:  movies[movieKey],
			TicketURL: entry.Showtime.TicketURL,
		}
	}

	err = os.MkdirAll("public", os.FileMode(int32(0755)))
	if err != nil {
		return err
	}

	outFile, err := os.OpenFile("public/index.html", os.O_RDWR|os.O_CREATE|os.O_TRUNC, os.FileMode(int32(0644)))
	defer outFile.Close()
	if err != nil {
		return err
	}

	err = t.Execute(outFile, TemplateVars{
		ByTime:          buckets,
		Details:         details,
		Movies:          movies,
		GoogleAnalytics: "",
	})
	if err != nil {
		return err
	}

	return nil
}
