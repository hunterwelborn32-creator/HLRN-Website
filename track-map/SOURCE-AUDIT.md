# NASCAR track-outline sourcing progress

## License verification (2026-10-21)

**Do not import iRacing website/CDN map SVGs merely because their URL is public.**
The `meowmachine/racing-track-maps-vector` project says its iRacing assets
were scraped from the iRacing portal; no reusable license was verified for
those SVGs. Its RaceStudio 3 derivative map collection likewise has
unverified downstream rights.

**RaceTracksAPI** (LigasAVBrasil) offers a publicly readable `tracks.json`
and SVG map files, but repository contents do not include a LICENSE file
at the repository root as checked on 2026-10-21. A description saying
"open-source" is not enough to authorize copying its graphics to HLRN.

## Potential venue sources found

| Venue/layout | RaceTracksAPI map ID | Status |
|---|---|---|
| Daytona oval | 27.1 | Asset license unresolved |
| Daytona road course (modern) | 27.3 | Asset license unresolved; verify exact layout |
| Charlotte oval | 118.1 | Asset license unresolved |
| Charlotte road circuit | 118.2 | Asset license unresolved; not necessarily current Roval |
| Indianapolis oval | 36.3 | Asset license unresolved |
| Indianapolis road course | 36.1 | Asset license unresolved |
| Watkins Glen long + Inner Loop | 32.1 | Asset license unresolved |
| Watkins Glen short + Inner Loop | 32.2 | Asset license unresolved |
| Sonoma variants | 78.1–78.4 | Asset license unresolved; NASCAR variant check needed |

Wikimedia Commons has some independently licensed circuit art, including
`Daytona International Speedway Road Course 2024.svg` under CC BY-SA 4.0
and `Daytona International Speedway - Moto Course.svg` dedicated to public
domain. These **do not** establish a licensed current NASCAR Daytona oval
centerline or correct racing-direction calibration.

## Remaining work for every authentic venue

1. Obtain authorized reusable track geometry for the exact NASCAR configuration.
2. Normalize its driving centerline, pit lane and start/finish coordinates.
3. Verify geometry against an authoritative track plan or a known licensed source.
4. Calibrate progress start and direction using an actual iRacing spectator lap.
5. Add it to `verified-geometry.mjs` with source, attribution and license.
6. Run tests and review the moving-car demo before making the geometry live.

Current production and this PR intentionally keep generic silhouettes marked
as such. No unlicensed art has been imported.
