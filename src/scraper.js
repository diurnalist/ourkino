import async from 'async';

// Avoid making too many calls in parallel - some sites cannot take
// sudden bursts of traffic, even minor.
const concurrentTaskLimit = 4;

export function getShowtimes(scrapers) {
  return new Promise((resolve, reject) => {
    async.parallelLimit(scrapers, concurrentTaskLimit, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.reduce((acc, list) => acc.concat(list), [])
          .filter(Boolean));
      }
    });
  });
};
