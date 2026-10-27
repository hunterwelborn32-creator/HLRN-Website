# HLRN GitHub Sync — private five-minute Apps Script dispatcher

**Status: Scheduler code committed; NOT installed or authorized in Google Apps Script.**

## Why this is needed

The existing `.github/workflows/sync-hlrn-data.yml` is already correctly scheduled with `cron: '2-59/5 * * * *'` and has `workflow_dispatch` enabled, but GitHub's native scheduled runs can be delayed or dropped. A separate, time-driven Apps Script can submit a workflow dispatch every five minutes.

**Security warning:** The HLRN Hosted Session spreadsheet and JSON intake folder are presently shared as `anyone with the link: Editor`. **Never put a GitHub PAT into their bound/shared Apps Script project or into this public GitHub repository.** Use a NEW, PRIVATE standalone Apps Script project under `hunterwelborn32@gmail.com` that you do not share.

## Setup

1. Open [GitHub fine-grained token creation](https://github.com/settings/personal-access-tokens/new), signed into the account with access to `hunterwelborn32-creator/HLRN-Website`. Create a token with:
   - Resource owner: account that owns or administers the repository
   - Repository access: **Only select repositories** → **HLRN-Website**
   - Repository permissions: **Actions → Read and write** (Metadata read is added automatically)
   - Sensible expiration; renew before it expires
2. In **hunterwelborn32@gmail.com**, open [Google Apps Script](https://script.google.com/home) → **New project** (standalone, NOT attached to the HLRN spreadsheet). Name it `HLRN GitHub Sync Scheduler`. Keep it private, and do not share it.
3. Replace that project's default `Code.gs` with [Code.gs](./Code.gs). **No token goes in code.**
4. Click **Project Settings** (gear) → **Script Properties** → **Add script property**. Name: `HLRN_GITHUB_TOKEN`. Value: your GitHub token. Save. **Do not send this secret in chat** or commit it to GitHub.
5. In the Apps Script function dropdown select `installHLRNGitHubWorkflowScheduler` → **Run**. Approve the Google authorization prompts (external HTTP requests and script trigger management).
6. The installer calls the GitHub API once immediately to validate your token. A correct log begins `HLRN GitHub workflow dispatch ACCEPTED (HTTP 200 or 204)`, followed by `HLRN GitHub scheduler INSTALLED`.
7. In Apps Script **Triggers** (clock icon), confirm exactly one time-driven trigger for `dispatchHLRNGitHubWorkflow` every five minutes. You can also inspect **Executions** to see when it fires.
8. Check [the actual workflow runs](https://github.com/hunterwelborn32-creator/HLRN-Website/actions/workflows/sync-hlrn-data.yml). Look for fresh runs whose event is **workflow_dispatch**, and confirm they finish successfully. A successful API dispatch request does not guarantee a successful workflow job.

## Interaction with current workflows

- **Email → Drive** script: untouched.
- **Drive → spreadsheet** script: untouched.
- **Manual Import ALL JSON Races**: untouched.
- **Existing GitHub cron**: untouched, acts as a fallback initially.
- **Manual Run workflow button**: untouched.

**After you confirm this new dispatcher works for several cycles**, consider changing the GitHub-native `schedule` to hourly fallback to avoid duplicate GitHub runs. Do not make that change before successfully installing this external scheduler.

Google time-driven triggers are approximately recurring; neither system guarantees that a job **starts or finishes at an exact second**. GitHub workflow concurrency already queues rather than cancels overlapping runs.

## Troubleshooting

- HTTP **401**: token absent, invalid, or expired.
- HTTP **403**: token lacks repository `Actions: Read and write`, policy/permission issue, or an API limit.
- HTTP **404**: wrong repo/owner, token lacks access, or missing/inaccessible workflow.
- GitHub API accepted dispatch but website unchanged: inspect the workflow job logs, GitHub secrets, and whether the Hosted snapshot actually differs.

## Disable safely

Run `disableHLRNGitHubWorkflowScheduler` from the private script. This removes **only this external timer**, leaving existing GitHub cron and both HLRN importer systems unchanged.

## Official references

- [GitHub workflow dispatch API](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)
- [GitHub scheduled workflow delays](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows#scheduled-workflows-running-at-unexpected-times)
- [Google Apps Script clock triggers](https://developers.google.com/apps-script/reference/script/clock-trigger-builder#everyMinutes(Integer))
