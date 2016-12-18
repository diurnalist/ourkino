const fs = require('fs');
const handlebars = require('handlebars');
const path = require('path');
const program = require('commander');

program
  .version('0.0.1')
  .option('-o, --output-dir', 'Output directory')
  .parse(process.argv);

function loadFilmData() {
  return new Promise((resolve, reject) => {
    fs.readFile('films.json', (err, contents) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(contents.toString('utf-8')));
      }
    });
  });
}

const template = handlebars.compile(fs.readFileSync(path.resolve(__dirname, '../index.tmpl')).toString());

loadFilmData()
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
      fs.writeFile('index.html', template({ showtimes: showtimes }), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
