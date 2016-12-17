// start simple express server

// Testing
require('./scraper/yorck')()
  .then((events) => {
    console.log(JSON.stringify(events));
  }, (err) => {
    console.log(err);
  });
