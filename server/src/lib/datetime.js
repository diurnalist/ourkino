module.exports = {
  todayUTC() {
    const now = new Date();
    now.setUTCFullYear(now.getFullYear());
    now.setUTCMonth(now.getMonth(), now.getDate());
    now.setUTCHours(0);
    now.setUTCMinutes(0);
    now.setUTCSeconds(0);
    now.setUTCMilliseconds(0);
    return now;
  }
};
