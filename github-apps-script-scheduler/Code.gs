/**
 * HLRN GITHUB WORKFLOW SCHEDULER — PRIVATE STANDALONE APPS SCRIPT
 *
 * IMPORTANT:
 * - Create a NEW, PRIVATE standalone script at https://script.google.com/home
 * - DO NOT paste this into the HLRN spreadsheet's bound Apps Script:
 *   the spreadsheet currently has "anyone with the link: Editor" access.
 * - DO NOT paste tokens into this source or into GitHub.
 *
 * The Github PAT lives only in this private script's Script Properties,
 * under the property name HLRN_GITHUB_TOKEN.
 *
 * Does not read or change the spreadsheet, Drive folder, email account,
 * or website workflow code.
 */

const HLRN_GITHUB_SYNC = Object.freeze({
  repo: "hunterwelborn32-creator/HLRN-Website",
  workflow: "sync-hlrn-data.yml",
  branch: "main",
  propertyName: "HLRN_GITHUB_TOKEN",
  triggerHandler: "dispatchHLRNGitHubWorkflow"
});

/**
 * FIRST set Project Settings -> Script Properties:
 *   HLRN_GITHUB_TOKEN = <fine-grained GitHub PAT for this repo,
 *                       with Actions Read and write>
 *
 * Then run this once and approve permissions.
 *
 * Performs a live GitHub API dispatch BEFORE installing the five-minute
 * timer, so misconfigured tokens do not install a broken schedule.
 */
function installHLRNGitHubWorkflowScheduler() {
  const result = dispatchHLRNGitHubWorkflow();

  const existing = ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === HLRN_GITHUB_SYNC.triggerHandler);

  // Avoid duplicate timers if this installer is run more than once.
  existing.forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger(HLRN_GITHUB_SYNC.triggerHandler)
    .timeBased()
    .everyMinutes(5)
    .create();

  console.log(
    "HLRN GitHub scheduler INSTALLED. GitHub accepted the initial dispatch " +
    "(HTTP " + result.httpStatus + "). Subsequent dispatches are scheduled " +
    "about every five minutes. Open GitHub Actions to confirm each run COMPLETES."
  );
}

/**
 * This function is called by the clock trigger, and can be run manually.
 * It is equivalent to clicking Actions -> Sync HLRN data -> Run workflow.
 * GitHub accepting the request means it was dispatched, not that the
 * workflow finished successfully.
 */
function dispatchHLRNGitHubWorkflow() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(2000)) {
    console.log("HLRN sync dispatch already running; skipping overlap.");
    return { skipped: true };
  }

  try {
    const properties = PropertiesService.getScriptProperties();
    const token = (properties.getProperty(HLRN_GITHUB_SYNC.propertyName) || "").trim();
    if (!token) {
      throw new Error(
        "Missing HLRN_GITHUB_TOKEN. In this PRIVATE Apps Script project, " +
        "go to Project Settings > Script Properties, add the GitHub token, " +
        "save it, then run the installer again. Never paste your token in the code."
      );
    }

    const url =
      "https://api.github.com/repos/" +
      HLRN_GITHUB_SYNC.repo +
      "/actions/workflows/" +
      HLRN_GITHUB_SYNC.workflow +
      "/dispatches";

    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ ref: HLRN_GITHUB_SYNC.branch }),
      headers: {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "HLRN-Hosted-Sync-Scheduler"
      },
      muteHttpExceptions: true,
      followRedirects: false
    });

    const status = response.getResponseCode();
    const body = response.getContentText() || "";

    if (status !== 200 && status !== 204) {
      let message = "";
      try {
        message = JSON.parse(body).message || "";
      } catch (_) {
        message = body.slice(0, 300);
      }
      throw new Error(
        "GitHub declined HLRN workflow dispatch: HTTP " + status +
        (message ? " — " + String(message).slice(0, 300) : "") +
        ". Check PAT expiry, repository selection, Actions permission, " +
        "and that the workflow is enabled."
      );
    }

    // Newer GitHub responses can return a run ID; older responses can be 204.
    let runDetails = null;
    if (body) {
      try { runDetails = JSON.parse(body); } catch (_) {}
    }

    const link = runDetails && runDetails.html_url
      ? runDetails.html_url
      : "https://github.com/" + HLRN_GITHUB_SYNC.repo +
        "/actions/workflows/" + HLRN_GITHUB_SYNC.workflow;

    properties.setProperty("HLRN_GITHUB_LAST_DISPATCH_OK", new Date().toISOString());

    console.log(
      "HLRN GitHub workflow dispatch ACCEPTED (HTTP " + status + "). " +
      "Check the run at: " + link
    );

    return { httpStatus: status, runUrl: link };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Stop external dispatches without touching the GitHub-native cron,
 * email-to-Drive, Drive-to-Sheets, or manual Run workflow options.
 */
function disableHLRNGitHubWorkflowScheduler() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === HLRN_GITHUB_SYNC.triggerHandler)
    .forEach(t => ScriptApp.deleteTrigger(t));
  console.log("HLRN external GitHub dispatch timer disabled.");
}
