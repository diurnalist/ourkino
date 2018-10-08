(function () {

  var doc = window.document;

  doc.addEventListener('DOMContentLoaded', function (event) {

    var showtimeEls = doc.querySelectorAll('.showtime');
    var filterEl = doc.querySelector('.filter > input');
    var gotoPageLinks = doc.querySelectorAll('[data-goto-page]');

    // Hide any events in the past
    showtimeEls.forEach(function (el) {
      var localShowtime = new Date(el.dataset.isoTime);
      localShowtime.setHours(localShowtime.getUTCHours());

      var cutoff = new Date();
      cutoff.setHours(cutoff.getUTCHours());

      if (localShowtime < cutoff) {
        el.style.display = 'none';
      }
    });

    // Allow filtering
    filterEl.addEventListener('input', function (event) {
      var query = filterEl.value.toLowerCase();
      var isInverse = query.indexOf('-') === 0;
      if (isInverse) {
        query = query.slice(1);
      }

      showtimeEls.forEach(function (el) {
        var textSearch = el.dataset.textSearch;
        var found = textSearch.indexOf(query) >= 0;
        el.style.display = found ^ isInverse ? '' : 'none';
      });
    });

    // Allow navigating between pages
    gotoPageLinks.forEach(function (linkEl) {
      var gotoPage = linkEl.dataset.gotoPage;

      linkEl.addEventListener('click', function (event) {
        gotoPageLinks.forEach(function (le) {
          le.parentNode.classList.toggle('inactive', le !== linkEl);
        });

        doc.querySelectorAll('[data-page]').forEach(function (pageEl) {
          pageEl.classList.toggle('inactive', pageEl.dataset.page !== gotoPage);
        });
      });
    });

  });

})();
