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
      cutoff.setHours(cutoff.getHours() + 1);

      if (localShowtime < cutoff) {
        el.style.display = 'none';
      }
    });

    // Allow filtering
    filterEl.addEventListener('input', function (event) {
      var query = filterEl.value.toLowerCase();

      showtimeEls.forEach(function (el) {
        var textSearch = el.dataset.textSearch;
        el.style.display = textSearch.indexOf(query) >= 0 ? '' : 'none';
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
