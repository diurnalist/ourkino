package tmdb

import (
	"context"
)

// Movie represents a movie from The Movie Database
type Movie struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Overview    string `json:"overview"`
	PosterPath  string `json:"poster_path"`
	ReleaseDate string `json:"release_date"`
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
	GetMovie(ctx context.Context, id int) (Movie, error)

	// SearchMovies searches for movies by query string with optional filters
	SearchMovies(ctx context.Context, query string, opts SearchOptions) ([]Movie, error)

	// FindMovieByTitleAndYear attempts to find a movie by its title and release year.
	// Returns the best match if found, or an empty result if no good match is found.
	// The score field indicates confidence in the match (0-1).
	FindMovieByTitleAndYear(ctx context.Context, title string, year int) (SearchResult, error)
}
