/**
 * HLRN automatic Drive -> Google Sheet importer.
 *
 * ADD THIS AS A NEW FILE IN THE EXISTING HOSTED SHEET APPS SCRIPT PROJECT,
 * NOT in the hlrnraceresults@gmail.com email importer.
 *
 * One small compatibility change in the existing importAllRaces function is
 * required; see README.md. This leaves the manual import menu unchanged.
 */
const HLRN_AUTO_DRIVE_IMPORT = Object.freeze({
  folderId: '1OVhw197QGutoYP0_u-VIWrJ5XC68nYfF',
  spreadsheetId: '1YfY22x2dnI9T6Fi69pT3L91NAkmVQWdvL0IWbWhB-tM',
  lastAttemptSignatureKey: 'HLRN_AUTO_IMPORT_REMAINING_SIGNATURE',
  handler: 'checkHLRNDriveForNewJson'
});

/**
 * Run this once while signed into the OWNER'S Google account.
 * Creates a single five-minute time-driven trigger for the existing importer.
 */
function installHLRNDriveAutoImport() {
  if (typeof importAllRaces !== 'function') {
    throw new Error(
      'Open the Apps Script bound to HLRN Hosted Session. ' +
      'That project must already contain the importAllRaces() function.'
    );
  }

  const folder = DriveApp.getFolderById(HLRN_AUTO_DRIVE_IMPORT.folderId);
  SpreadsheetApp.openById(HLRN_AUTO_DRIVE_IMPORT.spreadsheetId);
  if (folder.getName() !== 'HLRN iRacing JSON Import') {
    throw new Error('Unexpected import folder name. No trigger created.');
  }

  // Touch only the trigger belonging to this feature.
  const triggers = ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === HLRN_AUTO_DRIVE_IMPORT.handler);
  triggers.forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger(HLRN_AUTO_DRIVE_IMPORT.handler)
    .timeBased()
    .everyMinutes(5)
    .create();

  console.log('HLRN automatic Drive importer installed. Every five minutes it ' +
              'checks for new JSONs. The existing manual importer is unchanged.');
}

/**
 * Safe to run manually for testing, and automatically by the time trigger.
 * Does not rebuild any sheets if the incoming folder is empty or unchanged.
 */
function checkHLRNDriveForNewJson() {
  const guard = LockService.getUserLock();
  if (!guard.tryLock(1000)) {
    console.log('An automatic import check is already running. Skipping.');
    return;
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const before = getHLRNPendingJsons_();

    if (before.entries.length === 0) {
      props.deleteProperty(HLRN_AUTO_DRIVE_IMPORT.lastAttemptSignatureKey);
      console.log('HLRN: no new JSON files in the incoming folder.');
      return;
    }

    if (before.signature ===
        props.getProperty(HLRN_AUTO_DRIVE_IMPORT.lastAttemptSignatureKey)) {
      console.log('HLRN: ' + before.entries.length +
                  ' unchanged JSON(s) still waiting after a previous attempt; ' +
                  'not repeatedly retrying them. Manual import remains available.');
      return;
    }

    console.log('HLRN: found ' + before.entries.length +
                ' pending JSON(s); running the EXISTING importAllRaces().');

    // The small change documented in README keeps this run headless.
    // No duplicate parsing/row-writing logic is introduced.
    importAllRaces(true);

    // Remember ONLY unchanged files that were actually present before the run.
    // If another file arrives during processing, the next timer run must see it
    // as NEW rather than accidentally marking it as already attempted.
    const after = getHLRNPendingJsons_();
    const beforeKeys = new Set(before.entries);
    const attemptedStillWaiting = after.entries.filter(k => beforeKeys.has(k));

    if (attemptedStillWaiting.length) {
      props.setProperty(
        HLRN_AUTO_DRIVE_IMPORT.lastAttemptSignatureKey,
        hlrnJsonSignature_(attemptedStillWaiting)
      );
    } else {
      props.deleteProperty(HLRN_AUTO_DRIVE_IMPORT.lastAttemptSignatureKey);
    }

    let status = {};
    try {
      status = JSON.parse(props.getProperty('HLRN_IMPORT_STATUS') || '{}');
    } catch (e) {
      console.warn('Could not parse import status: ' + e);
    }

    console.log(
      'HLRN: import run finished. ' +
      'Imported=' + (status.filesImported ?? 'see original logs') +
      '; duplicates=' + (status.duplicateFiles ?? 'unknown') +
      '; file errors=' + (status.failedFiles ?? 'unknown') +
      '; still pending=' + after.entries.length +
      '. Website publishing uses its separate existing sync workflow.'
    );
  } finally {
    guard.releaseLock();
  }
}

/**
 * Look only at files directly in the incoming folder, never the Imported
 * archive. Drive file IDs and modified times allow a changed/replaced file
 * to be attempted again without retrying one bad upload every five minutes.
 */
function getHLRNPendingJsons_() {
  const folder = DriveApp.getFolderById(HLRN_AUTO_DRIVE_IMPORT.folderId);
  const files = folder.getFiles();
  const entries = [];
  while (files.hasNext()) {
    const file = files.next();
    if (!/\.json$/i.test(file.getName())) continue;
    entries.push(file.getId() + ':' + file.getLastUpdated().getTime());
  }

  return {
    entries: entries,
    signature: hlrnJsonSignature_(entries)
  };
}

function hlrnJsonSignature_(entries) {
  if (!entries.length) return '';
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    entries.slice().sort().join('|'),
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
}

/**
 * Turn the automatic import OFF, without changing the email importer,
 * manual Drive upload workflow, or spreadsheet contents.
 */
function disableHLRNDriveAutoImport() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === HLRN_AUTO_DRIVE_IMPORT.handler)
    .forEach(t => ScriptApp.deleteTrigger(t));
  console.log('Automatic Drive import disabled. Manual imports still work.');
}
