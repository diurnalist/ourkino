// Testing
require('./scraper').getShowtimes()
  .then((d) => console.log(JSON.stringify(d)), (err) => console.log(err));
