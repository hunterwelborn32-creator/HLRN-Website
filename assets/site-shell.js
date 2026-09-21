(function () {
  "use strict";

  function bootHLRNNavigation() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", bootHLRNNavigation, { once: true });
      return;
    }

    /* Never create two global headers. */
    if (document.getElementById("hlrn-global-nav")) return;

    /* ---------------------------------------------------------
       FIND THE SITE ROOT SAFELY
       Works on:
       /HLRN-Website/
       /HLRN-Website/news/
       /HLRN-Website/drivers/
       etc.
    --------------------------------------------------------- */
    var scriptEl = document.currentScript;

    if (!scriptEl) {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].getAttribute("src") || "";
        if (src.indexOf("site-shell.js") !== -1) {
          scriptEl = scripts[i];
          break;
        }
      }
    }

    var base;

    try {
      if (scriptEl && scriptEl.src) {
        base = new URL("../", scriptEl.src);
      }
    } catch (e) {}

    /* GitHub Pages fallback */
    if (!base) {
      var path = window.location.pathname || "/";
      var marker = "/HLRN-Website/";
      var markerIndex = path.toLowerCase().indexOf(marker.toLowerCase());

      if (markerIndex !== -1) {
        base = new URL(
          path.slice(0, markerIndex + marker.length),
          window.location.origin
        );
      } else {
        base = new URL("/", window.location.origin);
      }
    }

    function to(p) {
      return new URL(p || "", base).href;
    }

    var pagePath = (window.location.pathname || "").toLowerCase();

    var active =
      pagePath.indexOf("/live/") !== -1 ? "live" :
      pagePath.indexOf("/standings/") !== -1 ? "standings" :
      pagePath.indexOf("/race-intelligence/") !== -1 ? "intelligence" :
      pagePath.indexOf("/schedule/") !== -1 ? "results" :
      pagePath.indexOf("/results/") !== -1 ? "results" :
      pagePath.indexOf("/drivers/") !== -1 ? "drivers" :
      pagePath.indexOf("/fantasy/") !== -1 ? "fantasy" :
      pagePath.indexOf("/news/") !== -1 ? "news" :
      pagePath.indexOf("/rules/") !== -1 ? "rules" :
      pagePath.indexOf("/broadcasters/") !== -1 ? "broadcasters" :
      pagePath.indexOf("/store/") !== -1 ? "store" :
      "home";

    var primaryItems = [
      ["home", "Home", ""],
      ["live", "Live", "live/"],
      ["standings", "Standings", "standings/"],
      ["intelligence", "Intelligence", "race-intelligence/"],
      ["results", "Results", "results/"],
      ["drivers", "Drivers", "drivers/"],
      ["fantasy", "Fantasy", "fantasy/"],
      ["news", "News", "news/"]
    ];

    var moreItems = [
      ["rules", "Rules", "rules/"],
      ["broadcasters", "Broadcasters", "broadcasters/"],
      ["store", "Store", "store/"]
    ];

    var moreActive = false;
    for (var m = 0; m < moreItems.length; m++) {
      if (moreItems[m][0] === active) {
        moreActive = true;
        break;
      }
    }

    function primaryMarkup() {
      var out = "";
      for (var i = 0; i < primaryItems.length; i++) {
        var item = primaryItems[i];
        out +=
          '<a class="hgn-link ' +
          (active === item[0] ? "active" : "") +
          '" href="' + to(item[2]) + '">' +
          item[1] +
          "</a>";
      }
      return out;
    }

    function mobilePrimaryMarkup() {
      var out = "";
      for (var i = 0; i < primaryItems.length; i++) {
        var item = primaryItems[i];
        out +=
          '<a class="' +
          (active === item[0] ? "active" : "") +
          '" href="' + to(item[2]) + '">' +
          item[1] +
          "</a>";
      }
      return out;
    }

    function moreMarkup(className) {
      var out = "";
      for (var i = 0; i < moreItems.length; i++) {
        var item = moreItems[i];
        out +=
          '<a class="' + className + " " +
          (active === item[0] ? "active" : "") +
          '" href="' + to(item[2]) + '">' +
          item[1] +
          "</a>";
      }
      return out;
    }

    var nav = document.createElement("nav");
    nav.id = "hlrn-global-nav";
    nav.setAttribute("aria-label", "HLRN primary navigation");

    nav.innerHTML =
      '<div class="hgn-inner">' +

        '<a class="hgn-brand" href="' + to("") + '">' +
          '<span class="hgn-mark">HL</span>' +
          '<span class="hgn-name">' +
            'High Line Racing Network' +
            '<small>HLRN // Official Network</small>' +
          '</span>' +
        '</a>' +

        '<div class="hgn-links">' +
          primaryMarkup() +

          '<div class="hgn-more-wrap ' + (moreActive ? "active" : "") + '">' +
            '<button class="hgn-link hgn-more-btn ' +
              (moreActive ? "active" : "") +
              '" type="button" aria-haspopup="true" aria-expanded="false">' +
              'More <span class="hgn-more-arrow" aria-hidden="true">▾</span>' +
            '</button>' +

            '<div class="hgn-more-menu" role="menu">' +
              moreMarkup("hgn-more-item") +
            '</div>' +
          '</div>' +
        '</div>' +

        '<a class="hgn-live" href="' + to("live/") + '">' +
          '<i></i> Race Center' +
        '</a>' +

        '<button class="hgn-menu" type="button" aria-label="Open navigation" aria-expanded="false">☰</button>' +
      '</div>' +

      '<div class="hgn-mobile">' +
        mobilePrimaryMarkup() +

        '<button class="hgn-mobile-more" type="button" aria-expanded="false">' +
          'More <span>▾</span>' +
        '</button>' +

        '<div class="hgn-mobile-more-menu">' +
          moreMarkup("") +
        '</div>' +
      '</div>';

    document.body.insertBefore(nav, document.body.firstChild);

    /* ---------------------------------------------------------
       DESKTOP MORE
    --------------------------------------------------------- */
    var moreWrap = nav.querySelector(".hgn-more-wrap");
    var moreBtn = nav.querySelector(".hgn-more-btn");

    function openMore() {
      if (!moreWrap || !moreBtn) return;
      moreWrap.classList.add("open");
      moreBtn.setAttribute("aria-expanded", "true");
    }

    function closeMore() {
      if (!moreWrap || !moreBtn) return;
      moreWrap.classList.remove("open");
      moreBtn.setAttribute("aria-expanded", "false");
    }

    if (moreBtn) {
      moreBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (moreWrap.classList.contains("open")) closeMore();
        else openMore();
      });
    }

    if (moreWrap) {
      moreWrap.addEventListener("mouseenter", openMore);
      moreWrap.addEventListener("mouseleave", closeMore);
      moreWrap.addEventListener("focusin", openMore);
      moreWrap.addEventListener("focusout", function (ev) {
        if (!moreWrap.contains(ev.relatedTarget)) closeMore();
      });
    }

    document.addEventListener("click", function (ev) {
      if (moreWrap && !moreWrap.contains(ev.target)) closeMore();
    });

    /* ---------------------------------------------------------
       MOBILE NAV
    --------------------------------------------------------- */
    var menuBtn = nav.querySelector(".hgn-menu");
    var mobileMenu = nav.querySelector(".hgn-mobile");
    var mobileMoreBtn = nav.querySelector(".hgn-mobile-more");
    var mobileMoreMenu = nav.querySelector(".hgn-mobile-more-menu");

    if (menuBtn && mobileMenu) {
      menuBtn.addEventListener("click", function () {
        var isOpen = mobileMenu.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", String(isOpen));
        menuBtn.textContent = isOpen ? "×" : "☰";
      });
    }

    if (mobileMoreBtn && mobileMoreMenu) {
      mobileMoreBtn.addEventListener("click", function () {
        var isOpen = mobileMoreMenu.classList.toggle("open");
        mobileMoreBtn.classList.toggle("open", isOpen);
        mobileMoreBtn.setAttribute("aria-expanded", String(isOpen));
      });
    }

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        closeMore();

        if (mobileMoreMenu) mobileMoreMenu.classList.remove("open");
        if (mobileMoreBtn) {
          mobileMoreBtn.classList.remove("open");
          mobileMoreBtn.setAttribute("aria-expanded", "false");
        }
      }
    });

    /* ---------------------------------------------------------
       MIGRATE OLD LINKS
       Schedule now routes to Results.
    --------------------------------------------------------- */
    document.addEventListener("click", function (ev) {
      var target = ev.target;
      if (!target || !target.closest) return;

      var a = target.closest("a[href]");
      if (!a) return;

      var u;
      try {
        u = new URL(a.href, window.location.href);
      } catch (e) {
        return;
      }

      var host = (u.hostname || "").toLowerCase();
      var p = (u.pathname || "").toLowerCase();
      var dest = null;

      if (
        host === "sites.google.com" &&
        p.indexOf("/view/highlineracingnetwork") !== -1
      ) {
        if (p.indexOf("/race-intelligence") !== -1 || p.indexOf("/race intelligence") !== -1) dest = "race-intelligence/";
        else if (p.indexOf("/standings") !== -1) dest = "standings/";
        else if (p.indexOf("/schedule") !== -1) dest = "results/";
        else if (
          p.indexOf("/meet-our-team") !== -1 ||
          p.indexOf("/driver") !== -1
        ) dest = "drivers/";
        else if (p.indexOf("/news") !== -1) dest = "news/";
        else if (p.indexOf("/rules") !== -1) dest = "rules/";
        else if (p.indexOf("/broadcast") !== -1) dest = "broadcasters/";
        else if (p.indexOf("/store") !== -1) dest = "store/";
        else dest = "";
      } else if (host === "hlrn-live-feed.onrender.com") {
        dest = "live/";
      }

      if (
        dest === null &&
        host === window.location.hostname &&
        p.indexOf("/hlrn-website/schedule/") !== -1
      ) {
        dest = "results/";
      }

      if (dest !== null) {
        ev.preventDefault();
        window.location.href = to(dest);
      }
    }, true);
  }

  /* Boot now if possible, otherwise wait. */
  if (document.readyState === "loading" && !document.body) {
    document.addEventListener("DOMContentLoaded", bootHLRNNavigation, { once: true });
  } else {
    bootHLRNNavigation();
  }
})();
