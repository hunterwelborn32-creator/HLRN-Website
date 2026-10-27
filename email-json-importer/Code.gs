/**
 * HLRN Email JSON Intake — ADDITIVE ONLY.
 *
 * This script runs in the HLRN race-results Gmail account. It saves approved
 * JSON email attachments into the existing Google Drive incoming folder.
 * It does NOT edit the spreadsheet, importer, archive, GitHub, or website.
 *
 * Setup: see email-json-importer/README.md.
 */
const HLRN_EMAIL = Object.freeze({
  incomingFolderId: '1OVhw197QGutoYP0_u-VIWrJ5XC68nYfF',
  importedFolderId: '1B3rPs6wlgUNZ_Ta9VZcczIhT3jSdQUzw',
  query: 'in:inbox has:attachment newer_than:30d',
  maxThreadsPerRun: 100,
  maxAttachmentBytes: 15 * 1024 * 1024,
  processedKeyPrefix: 'HLRN_EMAIL_DONE_',
  startKey: 'HLRN_EMAIL_START_MS',
  senderKey: 'HLRN_ALLOWED_SENDERS',
  lastCleanupKey: 'HLRN_EMAIL_LAST_CLEANUP'
});

/**
 * Run ONCE while signed into the dedicated results Gmail account.
 * Script property HLRN_ALLOWED_SENDERS must be set before running.
 * Newly installed scripts only process messages received after installation.
 */
function installHLRNEmailImporter() {
  const allowed = getHLRNAllowedSenders_();
  if (!allowed.size) {
    throw new Error('Set script property HLRN_ALLOWED_SENDERS to comma-separated admin email addresses first.');
  }

  // Fail immediately if the mailbox cannot write to the existing intake folder.
  DriveApp.getFolderById(HLRN_EMAIL.incomingFolderId).getName();
  DriveApp.getFolderById(HLRN_EMAIL.importedFolderId).getName();

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(HLRN_EMAIL.startKey)) {
    props.setProperty(HLRN_EMAIL.startKey, String(Date.now()));
  }

  // Prevent duplicate triggers if setup is run again.
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'processHLRNEmailInbox')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('processHLRNEmailInbox')
    .timeBased()
    .everyMinutes(5)
    .create();

  console.log('HLRN email intake installed: five-minute polling; ' +
              allowed.size + ' approved sender(s). Existing uploads remain unchanged.');
}

/**
 * Safe to run manually after emailing a test JSON from an approved sender.
 * The script deliberately never deletes, moves, or edits existing Drive files.
 */
function processHLRNEmailInbox() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    console.log('Another intake run is active; skipping this run.');
    return;
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const startMs = Number(props.getProperty(HLRN_EMAIL.startKey));
    const allowed = getHLRNAllowedSenders_();
    if (!startMs || !allowed.size) {
      throw new Error('Run installHLRNEmailImporter after configuring HLRN_ALLOWED_SENDERS.');
    }

    const incoming = DriveApp.getFolderById(HLRN_EMAIL.incomingFolderId);
    const imported = DriveApp.getFolderById(HLRN_EMAIL.importedFolderId);
    const threads = GmailApp.search(HLRN_EMAIL.query, 0, HLRN_EMAIL.maxThreadsPerRun);

    // Review messages, not just thread labels, so new replies are not skipped.
    threads.reverse().forEach(thread => {
      thread.getMessages().forEach(message => {
        if (message.getDate().getTime() < startMs) return;

        const messageKey = HLRN_EMAIL.processedKeyPrefix + message.getId();
        if (props.getProperty(messageKey)) return;

        const sender = extractHLRNEmail_(message.getFrom());
        // A sender allowlist is a basic barrier; keep the mailbox private too.
        if (!allowed.has(sender)) return;

        const attachments = message.getAttachments({
          includeInlineImages: false,
          includeAttachments: true
        }).filter(blob => /\.json$/i.test(blob.getName() || ''));

        if (!attachments.length) return;

        const added = [];
        const duplicates = [];
        const rejected = [];

        attachments.forEach(attachment => {
          const name = sanitizeHLRNFilename_(attachment.getName());
          if (!name || !/\.json$/i.test(name)) {
            rejected.push('Attachment has an invalid file name.');
            return;
          }

          if (attachment.getSize() > HLRN_EMAIL.maxAttachmentBytes) {
            rejected.push(name + ' is larger than the 15 MB attachment limit.');
            return;
          }

          try {
            const json = JSON.parse(attachment.getDataAsString('UTF-8'));
            if (json === null || typeof json !== 'object') {
              rejected.push(name + ' does not contain a JSON object or array.');
              return;
            }
          } catch (error) {
            rejected.push(name + ' is not valid JSON.');
            return;
          }

          // Existing manual uploads and already imported files win. A repeated
          // filename is not re-uploaded or overwritten.
          if (incoming.getFilesByName(name).hasNext() ||
              imported.getFilesByName(name).hasNext()) {
            duplicates.push(name);
            return;
          }

          // Preserve the iRacing filename (e.g. eventresult-123456.json) so the
          // existing importer can consume this file exactly like a manual upload.
          const blob = attachment.copyBlob()
            .setName(name)
            .setContentType('application/json');
          incoming.createFile(blob);
          added.push(name);
        });

        // Mark only after the entire message has been handled. An unexpected
        // Drive failure leaves it eligible for retry on the next trigger.
        props.setProperty(messageKey, String(Date.now()));
        console.log('HLRN email from ' + sender + ': added=' + added.length +
                    ', already present=' + duplicates.length +
                    ', rejected=' + rejected.length);

        // Confirmation means saved to Drive, NOT yet published on the website.
        const lines = [
          'HLRN race file intake result:',
          'Saved to the incoming Google Drive folder: ' + added.length,
          'Already present (not uploaded twice): ' + duplicates.length,
          'Rejected: ' + rejected.length,
          '',
          'The existing HLRN importer and website sync run separately.'
        ];
        if (rejected.length) {
          lines.push('', 'Files needing attention:', ...rejected);
        }
        try {
          GmailApp.sendEmail(sender, 'HLRN race JSON intake result', lines.join('\n'), {
            name: 'HLRN Race Results'
          });
        } catch (mailError) {
          console.error('Files handled, but confirmation email failed: ' + mailError);
        }
      });
    });

    pruneHLRNProcessedKeys_(props);
  } finally {
    lock.releaseLock();
  }
}

function getHLRNAllowedSenders_() {
  const value = PropertiesService.getScriptProperties()
    .getProperty(HLRN_EMAIL.senderKey) || '';
  return new Set(value.split(/[,;\n]/).map(s => s.trim().toLowerCase()).filter(Boolean));
}

function extractHLRNEmail_(from) {
  const match = String(from || '').match(/<([^<>]+)>/);
  return (match ? match[1] : String(from || '')).trim().toLowerCase();
}

function sanitizeHLRNFilename_(name) {
  return String(name || '').replace(/[\/\\\x00-\x1f]/g, '_').trim().slice(0, 180);
}

/** Old IDs can be removed because the Gmail search covers only 30 days. */
function pruneHLRNProcessedKeys_(props) {
  const now = Date.now();
  if (now - Number(props.getProperty(HLRN_EMAIL.lastCleanupKey) || 0) < 86400000) return;

  const olderThan = now - 45 * 86400000;
  const all = props.getProperties();
  Object.keys(all).forEach(key => {
    if (key.startsWith(HLRN_EMAIL.processedKeyPrefix) &&
        Number(all[key]) < olderThan) props.deleteProperty(key);
  });
  props.setProperty(HLRN_EMAIL.lastCleanupKey, String(now));
}
