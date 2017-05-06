(function () {

  var doc = window.document;

  doc.addEventListener('DOMContentLoaded', function (event) {

    // Hide any events in the past
    var showtimeEls = doc.querySelectorAll('.showtime');
    showtimeEls.forEach(function (el) {
      var localShowtime = new Date(el.dataset.isoTime);
      localShowtime.setHours(localShowtime.getUTCHours());

      var cutoff = new Date();
      cutoff.setHours(cutoff.getHours() + 1);

      if (localShowtime < cutoff) {
        el.style = 'display: none;';
      }
    });

    var filterEl = doc.querySelector('.filter > input');
    filterEl.addEventListener('keyup', function (event) {
      var query = filterEl.value.toLowerCase();

      showtimeEls.forEach(function (el) {
        var textSearch = el.dataset.textSearch;
        el.style = textSearch.indexOf(query) >= 0 ? '' : 'display: none;';
      });
    });

    var gotoPageLinks = doc.querySelectorAll('[data-goto-page]');
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
