# ourkino

A simple movie showtime listing for a highly curated list of locations. Currently supports showtimes for 🇩🇪 **Berlin** and 🇺🇸 **Chicago**, because that is where I have resided.

This listing is biased towards independent cinemas. Particularly in Berlin, there was no single site that simply listed what films are playing across the subset of kinos that tend to run indie films.

![screenshot](./screenshot.png)

## Building

```shell
yarn install && yarn build
```

## Testing

### Testing a single scraper

```shell
# Pass in name of scraper as argument
yarn run test-scraper -- 'gene siskel'
```
