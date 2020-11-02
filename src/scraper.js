import async from 'async';

// Avoid making too many calls in parallel - some sites cannot take
// sudden bursts of traffic, even minor.
const concurrentTaskLimit = 4;

function dedupe() {
  const seenPairs = [];
  const isSeen = ({ title, showtime, location }) => {
    for (let pair, i = 0; pair = seenPairs[i++];) {
      if (title === pair.title &&
          showtime.isSame(pair.showtime) &&
          location === pair.location) return true;
    }
    return false;
  };
  return ({ title, showtime, location }) => {
    const pair = { title, showtime, location };
    if (isSeen(pair)) {
      return false;
    } else {
      seenPairs.push(pair);
      return true;
    }
  };
}

export async function getShowtimes(scrapers) {
  const data = await async.parallelLimit(scrapers, concurrentTaskLimit);
  const showtimes = data.reduce((acc, list) => acc.concat(list), []).filter(Boolean);
  const sorted = showtimes.sort(({ showtime: a }, { showtime: b }) => {
    if (a.isSame(b)) return 0;
    else if (a.isBefore(b)) return -1;
    else return 1;
  });
  const deduped = sorted.filter(dedupe());
  return deduped;
};
