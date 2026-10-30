/*
 * HLRN masthead logo: crop the TRANSPARENT margins on the client.
 * Unlike negative CSS background offsets, this measures the real
 * visible pixels in each PNG. The source files and themes stay intact.
 * This script only acts on the homepage, and leaves the old visible
 * logo as a fallback if the image or canvas cannot be read.
 */
(() => {
  "use strict";
  const scene = document.querySelector("#hlrnRaceDayHome > .home33-top-logo-scene");
  const home = document.querySelector("#hlrnRaceDayHome");
  if (!scene || !home) return;

  const sources = {
    light: "assets/homepage-art/Glossy%20HLRN%20Racing%20Network%20Logo.png",
    dark: "assets/homepage-art/HLRN%20Metallic%20Racing%20Network%20Logo.png"
  };
  const ready = new Map();
  let token = 0;
  let current = null;
  let resizeScheduled = false;

  function boundsOf(image) {
    const ratio = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas unavailable");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width, maxX = -1, minY = canvas.height, maxY = -1;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] < 24) continue;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) throw new Error("Logo has no visible pixels");
    const inv = 1 / ratio;
    const pad = 2 * inv;
    return {
      x: Math.max(0, minX * inv - pad),
      y: Math.max(0, minY * inv - pad),
      width: Math.min(image.naturalWidth, (maxX - minX + 1) * inv + pad * 2),
      height: Math.min(image.naturalHeight, (maxY - minY + 1) * inv + pad * 2)
    };
  }

  function sizeAndCenter(asset) {
    if (!asset) return;
    document.body.classList.add("hlrn-logo-smart-active");
    scene.classList.add("hlrn-logo-cropped");
    const h = scene.clientHeight;
    const w = scene.clientWidth;
    if (!h || !w) return;
    const widthLimit = w <= 650 ? w * 0.89 : w <= 1050 ? Math.min(w * 0.69, 590) : Math.min(w * 0.66, 670);
    const scale = Math.min(widthLimit / asset.bounds.width, (h * 0.80) / asset.bounds.height);
    if (!(scale > 0 && Number.isFinite(scale))) return;
    const logo = asset.image;
    logo.style.position = "absolute";
    logo.style.maxWidth = "none";
    logo.style.width = (asset.image.naturalWidth * scale) + "px";
    logo.style.height = (asset.image.naturalHeight * scale) + "px";
    logo.style.left = ((w - asset.bounds.width * scale) / 2 - asset.bounds.x * scale) + "px";
    logo.style.top = ((h - asset.bounds.height * scale) / 2 - asset.bounds.y * scale) + "px";
    logo.style.display = "block";
    logo.style.opacity = "1";
    logo.style.pointerEvents = "none";
    if (scene.firstElementChild !== logo) scene.replaceChildren(logo);
  }

  function setTheme() {
    const key = document.documentElement.getAttribute("data-hlrn-theme") === "dark" ? "dark" : "light";
    const myToken = ++token;
    if (ready.has(key)) {
      current = ready.get(key);
      sizeAndCenter(current);
      return;
    }
    const image = new Image();
    image.alt = "";
    image.decoding = "async";
    image.onload = () => {
      try {
        const asset = { image, bounds: boundsOf(image) };
        ready.set(key, asset);
        if (myToken === token) {
          current = asset;
          sizeAndCenter(asset);
        }
      } catch (err) {
        console.warn("HLRN logo auto-crop skipped; retaining original logo fallback.", err);
      }
    };
    image.onerror = () => console.warn("HLRN logo could not load; retaining original logo fallback.");
    image.src = sources[key];
  }

  setTheme();
  new MutationObserver((entries) => {
    if (entries.some(entry => entry.attributeName === "data-hlrn-theme")) setTheme();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-hlrn-theme"] });

  window.addEventListener("resize", () => {
    if (resizeScheduled) return;
    resizeScheduled = true;
    requestAnimationFrame(() => {
      resizeScheduled = false;
      if (current) sizeAndCenter(current);
    });
  }, { passive: true });
})();
