package tmdb

import (
	"context"
)

// Movie represents a movie from The Movie Database
type Movie struct {
	ID          int     `json:"id"`
	Title       string  `json:"title"`
	Overview    string  `json:"overview"`
	PosterPath  string  `json:"poster_path"`
	ReleaseDate string  `json:"release_date"`
	Popularity  float64 `json:"popularity"`
}

// MovieDetails represents a movie's detailed representation from The Movie Database
type MovieDetails struct {
	ID               int    `json:"id"`
	Title            string `json:"title"`
	Overview         string `json:"overview"`
	PosterPath       string `json:"poster_path"`
	ReleaseDate      string `json:"release_date"`
	Runtime          int    `json:"runtime"`
	OriginalLanguage string `json:"original_language"`
}

// MovieCredits represents a movie's credits from The Movie Database
type MovieCredits struct {
	Cast []struct {
		ID        int    `json:"id"`
		Name      string `json:"name"`
		Character string `json:"character"`
	} `json:"cast"`
	Crew []struct {
		ID         int    `json:"id"`
		Name       string `json:"name"`
		Job        string `json:"job"`
		Department string `json:"department"`
	} `json:"crew"`
}

// SearchOptions contains optional parameters for movie search
type SearchOptions struct {
	// ReleaseYear, if non-zero, will filter results to movies released in that year
	ReleaseYear int
}

// SearchResult represents a movie found by search
type SearchResult struct {
	Movie Movie
	// Score represents how confident we are in this match (0-1)
	Score float64
}

// TMDB defines the interface for interacting with The Movie Database API
type TMDB interface {
	// GetMovie retrieves a movie by its ID
	GetMovie(ctx context.Context, id int) (MovieDetails, error)

	// SearchMovies searches for movies by query string with optional filters
	SearchMovies(ctx context.Context, query string, opts SearchOptions) ([]Movie, error)
}
