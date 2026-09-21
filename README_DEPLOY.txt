HLRN WEBSITE 2.0 — VERSION 1
================================

WHAT IS ALREADY MIGRATED
- Home: /index.html
- Live Race Center: /live/
- Standings: /standings/
- Schedule: /schedule/
- Results: /results/
- Fantasy: /fantasy/

PERMANENT ROUTES READY FOR NEXT MIGRATION
- Drivers: /drivers/
- News: /news/
- Rules: /rules/

IMPORTANT
- The Live Race Center still connects to the existing Render WebSocket backend at:
  wss://hlrn-live-feed.onrender.com/ws?role=viewer
- Your PC bridge.py does NOT need to be running just to upload/view the website.
  It only needs to run when you want real iRacing live telemetry.
- Old HLRN Google Sites links found inside migrated pages are intercepted by the
  shared navigation script and redirected to their new standalone routes.

GITHUB PAGES DEPLOYMENT
1. Create a new GitHub repository named HLRN-Website (or another name you prefer).
2. Upload the CONTENTS of this folder to the root of the repository.
   index.html must be at the repository root.
3. In GitHub: Settings -> Pages.
4. Under Build and deployment, choose Deploy from a branch.
5. Choose your main branch and /(root), then Save.
6. Your staging site will be available from your GitHub Pages project URL.
7. Keep the current Google Site public while this staging version is being tested.

NEXT MIGRATION PHASE
- Driver Center
- Newsroom
- Rulebook
- Shared assets (driver photos/logo) moved out of giant inline HTML where practical
- Final custom domain cutover
