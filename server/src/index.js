const addDays = require('date-fns/add_days');
const datetime = require('./lib/datetime');
const fs = require('fs');
const handlebars = require('handlebars');
const path = require('path');
const program = require('commander');
const scraper = require('./scraper');

program
  .version('0.0.1')
  .option('-o, --output-dir', 'Output directory')
  .parse(process.argv);

const template = handlebars.compile(fs.readFileSync(path.resolve(__dirname, '../index.tmpl')).toString());
const outputDir = path.resolve(__dirname, '../public');

function daysFromNow(days) {
  const today = datetime.todayUTC();
  const start = addDays(today, days);
  const end = addDays(start, 1);

  return ({ showtime }) => {
    const showtimeDate = new Date(showtime);
    return showtimeDate >= start && showtimeDate < end;
  };
}

function pad(number) {
  return (number < 10 ? '0' : '') + number;
}

function toTemplateData({ showtime, location, language, film: { title } }) {
  const showtimeDate = new Date(showtime);
  const hours = pad(showtimeDate.getUTCHours());
  const minutes = pad(showtimeDate.getUTCMinutes());

  return {
    time: `${hours}:${minutes}`,
    isoTime: showtime,
    location,
    language,
    title
  };
}

scraper.getShowtimes()
  .then((films) => {
    // go from list of films with showtimes to list of showtimes with films
    const showtimes = films.reduce((acc, film) => {
      const showtimesForFilm = film.showtimes;
      delete film.showtimes; // remove circular reference
      acc = acc.concat(showtimesForFilm.map((showtime) => {
        showtime.film = film;
        return showtime;
      }));
      return acc;
    }, []);

    return showtimes;
  })
  .then((showtimes) => {
    // sort by date
    return showtimes.sort(({ showtime: a }, { showtime: b }) => {
      if (a === b) return 0;
      const aDate = Date.parse(a);
      const bDate = Date.parse(b);
      if (aDate < bDate) return -1;
      else return 1;
    });
  })
  .then((showtimes) => {
    return new Promise((resolve, reject) => {
      const today = showtimes.filter(daysFromNow(0)).map(toTemplateData);
      const tomorrow = showtimes.filter(daysFromNow(1)).map(toTemplateData);

      fs.writeFile(path.join(outputDir, 'index.html'), template({ today, tomorrow }), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
