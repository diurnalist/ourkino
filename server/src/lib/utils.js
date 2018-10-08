module.exports = {
  gcalURL(id) {
    return `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`;
  }
};
