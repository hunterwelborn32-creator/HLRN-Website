# NASCAR Track Geometry: verification and publishing

The HLRN NASCAR catalog recognizes track names and variants. It does **not**
mean every layout is geometrically accurate. The site continues to show
explicitly labeled type silhouettes for unmapped layouts.

To publish a real circuit path, add an entry to
`track-map/verified-geometry.mjs` using geometry that you are authorized
to reproduce. Supply:

- `path`: closed SVG centerline, normalized to the 860×470 canvas.
- `direction`: `1` if increasing iRacing lap progress moves with SVG path
  orientation; `-1` otherwise.
- `progressOffset`: start/finish fraction along that SVG path (0 to <1).
- `source`, `attribution`, `license`: provenance and reuse permission.

A correct outline alone does not guarantee real-world motion: calibrate
start/finish and direction against a real iRacing spectator session and
verify any alternative configuration separately. Pit-road is independent
and also requires a licensed path and correct pit-entry/exit positions.

Potential reference datasets for evaluation, **not automatically licensed
for reuse**:
- https://github.com/meowmachine/racing-track-maps-vector
  (SVG layers from iRacing and RaceStudio; check source and derivative rights).
- https://github.com/LigasAVBrasil/RaceTracksAPI
  (track metadata and diagrams; check individual rights).

Do not copy proprietary iRacing CDN map assets or site imagery into this
repo without licensing or other valid authorization. Track names are
not geometry licenses. Keep unverified drawings labeled as schematic.
