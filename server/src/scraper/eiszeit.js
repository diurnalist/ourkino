const log = require('debug')('scraper:eiszeit');
const request = require('request');
const split = require('split');

const EVENT_PAYLOAD_DECLARATION = 'var event =';

module.exports = () => {
  return new Promise((resolve, reject) => {
    const events = [];

    request('http://eiszeit.berlin')
      .pipe(split())
      .on('data', (chunk) => {
        const line = chunk.toString('utf-8').trim();
        if (line.startsWith(EVENT_PAYLOAD_DECLARATION)) {
          const eventPayloadJson = line
            .replace(EVENT_PAYLOAD_DECLARATION, '')
            .replace(/;$/, '')
            .trim();
          log('found event', eventPayloadJson);
          events.push(JSON.parse(eventPayloadJson));
        }
      })
      .on('end', () => resolve(events))
      .on('error', reject);
  });
};
