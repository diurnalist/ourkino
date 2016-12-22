(function () {

  var doc = window.document;

  doc.addEventListener('DOMContentLoaded', function (event) {

    // Hide any events in the past
    doc.querySelectorAll('.showtime').forEach(function (el) {
      var localShowtime = new Date(el.dataset.isoTime);
      localShowtime.setHours(localShowtime.getUTCHours());

      var cutoff = new Date();
      cutoff.setHours(cutoff.getHours() + 1);

      if (localShowtime < cutoff) {
        el.style = 'display: none;';
      }
    });

  });

})();
