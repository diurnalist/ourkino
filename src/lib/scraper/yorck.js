import cheerio from 'cheerio';
import request from 'request';
import debug from 'debug';
import { parse, today } from '../datetime.js';

const HOST = 'https://yorck.de';


function getBuildID() {
  return new Promise((resolve, reject) => {
    request({url: HOST}, (err, res) => {
      if (err) {
        console.log(err);
        return reject(err);
      }

      const $ = cheerio.load(res.body);
      const { buildId } = JSON.parse($('#__NEXT_DATA__').text());
      if (! buildId) {
        reject('failed to build showtime list');
      }
      resolve(buildId);
    });
  });
}

function getFilmsAndShowtimes(buildId) {
  return new Promise((resolve, reject) => {
    request({
      url: `${HOST}/_next/data/${buildId}/de/filme.json`,
      json: true
    }, (err, res) => {
      if (err) {
        return reject(err);
      }

      const { films } = res.body.pageProps;

      if (! films) {
        return reject('failed to parse showtimes');
      }

      resolve(films.map(({ fields }) => fields));
    });
  });
}

const extractShowtimes = (location, timezone) => (filmAndShowtimes) => {
  const showtimes = [];
  const todayDatetime = today(timezone);

  filmAndShowtimes.forEach(({ title, sessions }) => {
    sessions.forEach(({ fields: { startTime, formats, cinema }}) => {
      const { name } = cinema.fields;
      if (name === location) {
        showtimes.push({
          deepLink: null,
          language: formats && formats[0],
          location,
          showtime: parse(startTime, timezone),
          title
        });
      }
    });
  });

  return showtimes;
};

export default (location, timezone, cinemaId) => (callback) => {
  const log = debug(`scraper:${location.toLowerCase().replace(' ', '')}`);

  log('starting');
  getBuildID()
    .then(getFilmsAndShowtimes)
    .then(extractShowtimes(location, timezone))
    .then((showtimes) => {
      log(`got ${showtimes.length} results`);
      callback(null, showtimes);
    }, (err) => {
      log('error getting shows');
      callback(err);
    });
};
