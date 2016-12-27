module.exports = {
  todayUTC() {
    const now = new Date();
    now.setHours(0);
    now.setMinutes(0);
    now.setSeconds(0);
    now.setMilliseconds(0);
    return this.toUTC(now);
  },

  toUTC(date) {
    const utcDate = new Date(date);
    utcDate.setUTCFullYear(date.getFullYear());
    utcDate.setUTCMonth(date.getMonth(), date.getDate());
    utcDate.setUTCHours(date.getHours());
    utcDate.setUTCMinutes(date.getMinutes());
    utcDate.setUTCSeconds(date.getSeconds());
    utcDate.setUTCMilliseconds(date.getMilliseconds());
    return utcDate;
  }
};
