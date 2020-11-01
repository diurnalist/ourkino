import async from 'async';

// Avoid making too many calls in parallel - some sites cannot take
// sudden bursts of traffic, even minor.
const concurrentTaskLimit = 4;

export async function getShowtimes(scrapers) {
  const data = await async.parallelLimit(scrapers, concurrentTaskLimit);
  const showtimes = data.reduce((acc, list) => acc.concat(list), []).filter(Boolean);
  return showtimes;
};
