# HLRN Automatic Drive → Google Sheet Import

**Status: Code ready, not installed in Google Apps Script yet.**

This is the second stage of the existing HLRN race submission flow:

1. HLRN admins email JSON files to **hlrnraceresults@gmail.com** (the already-installed email script puts them in Drive), **or** you manually upload JSON files directly to Drive.
2. This new time-driven trigger checks the existing Drive import folder every five minutes and calls the **existing** spreadsheet importer **only if new JSONs are waiting**.
3. The existing importer parses race results, updates HLRN Hosted Session, avoids duplicate driver/race records, and moves imported files into the `Imported` archive.
4. The website's existing GitHub sync remains separate; this feature does not change its schedule.

**Important:** Google's five-minute Apps Script trigger is approximate, not an exact deadline. The original `importAllRaces` function uses a UI alert at the end; make the tiny compatibility change below so a timer can run it safely.

## Install (on the ORIGINAL HLRN spreadsheet account, not the racing mailbox)

1. Sign into **hunterwelborn32@gmail.com** and open [HLRN Hosted Session](https://docs.google.com/spreadsheets/d/1YfY22x2dnI9T6Fi69pT3L91NAkmVQWdvL0IWbWhB-tM/edit).
2. Select **Extensions → Apps Script**. This opens the EXISTING HLRN sheet importer script. Do not open the separate **HLRN Race Email Importer** project.
3. Add a new script file with **+ → Script**, named **AutoDriveImport**. Paste the complete contents of [AutoDriveImport.gs](./AutoDriveImport.gs).
4. Make this **small change** to the existing importer in its existing script file:
   
   Replace:
   
   ```js
   function importAllRaces() {
   ```
   
   with:
   
   ```js
   function importAllRaces(backgroundMode) {
   ```

   Then **inside this same function**, find the final success dialog, which starts:

   ```js
   SpreadsheetApp
     .getUi()
     .alert(
       "🏁 HLRN JSON Import — COMPLETE",
       finalMessage,
       SpreadsheetApp
         .getUi()
         .ButtonSet.OK
     );
   ```

   Wrap it in `if (!backgroundMode) { ... }` so the final code looks like:

   ```js
   if (!backgroundMode) {
     SpreadsheetApp
       .getUi()
       .alert(
         "🏁 HLRN JSON Import — COMPLETE",
         finalMessage,
         SpreadsheetApp
           .getUi()
           .ButtonSet.OK
       );
   } else {
     console.log('HLRN automated import finished: ' + finalMessage);
   }
   ```

   **Do not remove or change any parser, formula, exclusion list, race
   calculations, menu, or imported-file logic.** Manual invocations still call
   `importAllRaces()` with no argument and keep the normal popup.

   If the final success dialog in your LIVE Apps Script differs from the
   example, preserve its existing content and wrap it with the same
   `if (!backgroundMode) { ... }` conditional.

5. Save the script project.
6. In the Apps Script function dropdown, choose **installHLRNDriveAutoImport** and click **Run** one time. Approve Google's Drive/Sheet/trigger permissions when requested.
7. In Apps Script **Triggers** (clock icon), verify one trigger:
   - Function: `checkHLRNDriveForNewJson`
   - Source: **Time-driven**
   - Interval: **Every 5 minutes**
8. For an immediate test, choose **checkHLRNDriveForNewJson** and click **Run**. An existing JSON in the incoming folder (currently `eventresult-89153760.json` at last inspection) should be processed, moved to `Imported`, and added to the Hosted Session spreadsheet if not already recorded. See **Executions** for logs, and check spreadsheet results manually before declaring success.
9. After first success, submit a **new** race from email or manual upload and verify it moves to the `Imported` folder and updates the spreadsheet without clicking Import.

## What happens to failed JSONs?

- The original importer leaves invalid/unparseable JSON files in the incoming
  folder; this addon remembers their file IDs and modified timestamps.
- The same unchanged failed file **will not be retried indefinitely every five
  minutes**, preventing constant rebuilds. Upload a corrected/new file or
  use the manual menu to retry.
- A fresh JSON arriving alongside an old failed file causes another import
  attempt for both. The original importer's duplicate protections still apply.
- The original importer owns the script-wide import lock; this addon uses a
  separate per-user guard against overlapping timer checks.

## Turn it off

Select `disableHLRNDriveAutoImport` and **Run**. This deletes only the
`checkHLRNDriveForNewJson` time-driven trigger. The email inbox intake script,
direct Drive uploads, and manual spreadsheet imports continue working.

## No credentials

There are no tokens or passwords in this repository. The time-based trigger
runs under the **original spreadsheet owner's authorization**, and is not
activated by a GitHub commit alone.
