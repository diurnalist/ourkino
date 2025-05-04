package tmdb

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"time"
)

const (
	baseURL = "https://api.themoviedb.org/3"
)

// TMDBClient implements the TMDB interface
type TMDBClient struct {
	client  *http.Client
	apiKey  string
	baseURL string
}

// NewTMDBClient creates a new TMDB client
func NewTMDBClient(apiKey string) *TMDBClient {
	return &TMDBClient{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		apiKey:  apiKey,
		baseURL: baseURL,
	}
}

// GetMovie retrieves a movie by its ID
func (c *TMDBClient) GetMovie(ctx context.Context, id int) (MovieDetails, error) {
	path := fmt.Sprintf("/movie/%d", id)
	req, err := c.newRequest(ctx, path, nil)
	if err != nil {
		return MovieDetails{}, fmt.Errorf("creating request: %w", err)
	}

	var movie MovieDetails
	if err := c.do(req, &movie); err != nil {
		return MovieDetails{}, fmt.Errorf("getting movie: %w", err)
	}

	return movie, nil
}

// SearchMovies searches for movies by query string
func (c *TMDBClient) SearchMovies(ctx context.Context, query string, opts SearchOptions) ([]Movie, error) {
	params := url.Values{}
	params.Set("query", query)

	if opts.ReleaseYear != 0 {
		params.Set("primary_release_year", fmt.Sprintf("%d", opts.ReleaseYear))
	}

	req, err := c.newRequest(ctx, "/search/movie", params)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	var response struct {
		Results []Movie `json:"results"`
	}
	if err := c.do(req, &response); err != nil {
		return nil, fmt.Errorf("searching movies: %w", err)
	}

	// Sort results by popularity (highest first)
	sort.Slice(response.Results, func(i, j int) bool {
		return response.Results[i].Popularity > response.Results[j].Popularity
	})

	return response.Results, nil
}

// newRequest creates a new HTTP request with the proper headers
func (c *TMDBClient) newRequest(ctx context.Context, path string, params url.Values) (*http.Request, error) {
	url := c.baseURL + path
	if params != nil {
		url += "?" + params.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("authorization", "Bearer "+c.apiKey)
	req.Header.Set("accept", "application/json")

	return req, nil
}

// do performs the HTTP request and decodes the response
func (c *TMDBClient) do(req *http.Request, v interface{}) error {
	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("performing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	if err := json.NewDecoder(resp.Body).Decode(v); err != nil {
		return fmt.Errorf("decoding response: %w", err)
	}

	return nil
}

var _ TMDB = &TMDBClient{}
