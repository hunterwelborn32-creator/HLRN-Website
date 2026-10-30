/*
 * HLRN Results & Schedule banner image readiness.
 * Preserve the current text header until the matching day/night
 * image actually exists and loads successfully from the repository.
 */
(() => {
  "use strict";
  const html = document.documentElement;
  const readyClass = "hlrn-results-banner-ready";
  let generation = 0;

  function applyTheme() {
    const current = ++generation;
    const variant = html.getAttribute("data-hlrn-theme") === "dark" ? "Night" : "Day";
    html.classList.remove(readyClass);

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (current === generation && image.naturalWidth > 0 && image.naturalHeight > 0) {
        html.classList.add(readyClass);
      }
    };
    image.onerror = () => {
      if (current === generation) html.classList.remove(readyClass);
    };
    image.src = "/assets/results/HLRN-Results-Banner-" + variant + ".webp";
  }

  applyTheme();
  new MutationObserver((entries) => {
    if (entries.some((entry) => entry.attributeName === "data-hlrn-theme")) {
      applyTheme();
    }
  }).observe(html, { attributes: true, attributeFilter: ["data-hlrn-theme"] });
})();
