(function () {

  var doc = window.document;

  function onLoad() {
    var showtimeEls = doc.querySelectorAll('.showtime');
    var filterEl = doc.querySelector('.filter > input');
    var gotoPageLinks = doc.querySelectorAll('[data-goto-page]');
    var gotoDetailsLinks = doc.querySelectorAll('[data-goto-details]');

    // Hide any events in the past
    showtimeEls.forEach(function (el) {
      var localShowtime = new Date(el.dataset.isoTime);
      var cutoff = new Date();

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

    // Allow toggling details
    gotoDetailsLinks.forEach(function (linkEl) {
      var detailsKey = linkEl.dataset.gotoDetails;

      function closer(el) {
        var handler = function (event) {
          el.classList.toggle('active', false);
          el.removeEventListener('click', handler);
          event.preventDefault();
        }
        return handler;
      }

      linkEl.addEventListener('click', function (event) {
        doc.querySelectorAll('[data-details]').forEach(function (detailsEl) {
          var isActive = detailsEl.dataset.details === detailsKey;
          detailsEl.classList.toggle('active', isActive);
          if (isActive) {
            detailsEl.addEventListener('click', closer(detailsEl));
          }
        });
      });
    });
  }

  if (doc.readyState !== 'loading') {
    // Safari in particular seems to run this payload after the DOM content event has fired.
    onLoad()
  } else {
    doc.addEventListener('DOMContentLoaded', onLoad)
  }

})();
