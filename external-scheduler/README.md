# HLRN external Hosted sync scheduler

This Cloudflare Worker dispatches the existing `sync-hlrn-data.yml` GitHub Actions workflow every five minutes. It does not change Hosted processing or driver stats. The existing GitHub schedule is retained as a fallback until the external scheduler is confirmed live.

## One-time deployment

1. In Cloudflare Workers, connect this repository or use Wrangler in the `external-scheduler` directory.
2. Create a fine-grained GitHub personal access token scoped **only** to `hunterwelborn32-creator/HLRN-Website` with **Actions: Read and write**. Do not commit or paste the token into source files.
3. From `external-scheduler`, run `npx wrangler secret put GITHUB_ACTIONS_TOKEN` and enter the token when prompted.
4. Run `npx wrangler deploy` to deploy the Worker with its `*/5 * * * *` cron trigger.
5. Confirm Cloudflare scheduled invocations and GitHub workflow runs with event `workflow_dispatch` roughly every five minutes.

If desired after confirming reliability, remove the native `schedule` trigger from `.github/workflows/sync-hlrn-data.yml`; keep `workflow_dispatch` enabled for manual runs. Worker errors are visible in Cloudflare logs. Be aware GitHub Actions jobs and deployments can still be delayed after dispatch.
