# HLRN email-to-JSON intake (additive)

This adds a **second** way to submit Hosted race results. It does not change
the existing routine of uploading JSON files directly to Google Drive.

## What it does

Approved admin sends a `.json` file to a dedicated Gmail account
→ the Apps Script checks the mailbox every **five minutes**
→ saves valid JSON files into the **existing HLRN iRacing JSON Import folder**
→ the **existing Google Sheet importer** handles them as usual
→ the **existing GitHub/site data sync** publishes results as it normally does.

The script **does not** write directly to the spreadsheet or operate the website
sync. Confirm that the two existing downstream jobs are scheduled and healthy.
The five-minute interval applies only to the email mailbox check.

Existing folders:
- Incoming: https://drive.google.com/drive/folders/1OVhw197QGutoYP0_u-VIWrJ5XC68nYfF
- Imported archive: https://drive.google.com/drive/folders/1B3rPs6wlgUNZ_Ta9VZcczIhT3jSdQUzw
- Hosted Sheet: https://docs.google.com/spreadsheets/d/1YfY22x2dnI9T6Fi69pT3L91NAkmVQWdvL0IWbWhB-tM/edit

## One-time setup (requires owner interaction)

1. Create a dedicated Gmail address for race submissions (or choose an existing
   mailbox). Sign into that Gmail account.
2. While signed in as the owner of the HLRN Drive folder, **share the existing
   incoming folder with the new Gmail account as Editor**. Do NOT add the admins
   to the spreadsheet or give them Drive editor rights. The current folder
   already contains an `Imported` archive; the mailbox must be able to
   access it. Prefer direct shares to the mailbox over "anyone with link".
3. In the race-submissions Gmail account, visit https://script.google.com/ ,
   click **New project**, name it `HLRN Email JSON Intake`, and replace the
   sample `Code.gs` with the contents of [Code.gs](./Code.gs). Save.
4. In Apps Script open **Project Settings → Script properties**. Add:
   - Property: `HLRN_ALLOWED_SENDERS`
   - Value: the **email addresses of trusted admins**, comma-separated.
     Example: `admin1@example.com,admin2@example.com`.
     Put real addresses only in Script properties, NEVER in GitHub.
5. In the function selector, choose **installHLRNEmailImporter** and click Run
   **once**. Approve Gmail, Drive, and triggers permissions in that mailbox.
   This records the installation time so older mail is NOT imported.
6. Open **Triggers** (clock icon) and confirm that
   `processHLRNEmailInbox` runs on a time-driven five-minute schedule.
7. From one approved sender's email account, email a legitimate
   `eventresult-123456.json` attachment to the racing mailbox. For a quick
   check select `processHLRNEmailInbox` and click Run. Confirm the JSON appears
   in the incoming Drive folder, then check your existing Sheet importer and
   website sync. The admin will receive an intake confirmation, but website
   publication is a separate step.

## How admins use it

Send an email to the racing mailbox and attach the iRacing JSON file. No shared
Drive or Sheet link is needed. Subjects are optional. Only approved sender
addresses are processed. The racing mailbox owner may add/remove addresses by
editing the script property `HLRN_ALLOWED_SENDERS` (no code changes).

## Safeguards and limitations

- No manual-upload or Sheet code is changed. The email importer **only creates
  new files** in the existing intake folder.
- Only `.json` attachments from the configured sender allowlist are accepted.
  JSON syntax is checked; **this is not a guarantee the data is a valid race**.
- JSON attachments over **15 MB** are rejected.
- Filenames already in the incoming folder or `Imported` archive are skipped.
  A different filename for the same race is **not** guaranteed to be caught:
  keep the downstream importer session-level duplicate protection in place.
- Processed email message IDs are remembered to avoid reprocessing replies
  and repeated polling. Old markers are pruned after 45 days.
- Messages arriving **before setup** are ignored. The inbox query examines
  the newest 100 email threads with attachments within the previous 30 days.
  Very high-volume mailboxes may require paging.
- Gmail From-address allowlisting is not cryptographic sender authentication.
  Use a dedicated mailbox, keep the address for admins, don't trust spoofed
  submissions, and review your spam/security settings.
- The script's trigger runs under the Gmail account that installed it. Google
  time-driven triggers are approximate, not an exact delivery SLA.
- If the owner's Drive permissions change, Apps Script quota is exceeded, or
  downstream import/sync fails, the website may not update until fixed.

## Disable the email path without affecting manual uploads

In the racing mailbox's Apps Script project, open **Triggers** and delete
`processHLRNEmailInbox`. The original manual Drive upload workflow continues
unaffected.
