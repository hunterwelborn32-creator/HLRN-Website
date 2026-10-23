// External five-minute trigger for HLRN's existing GitHub data sync.
// Configure GITHUB_ACTIONS_TOKEN as an encrypted Cloudflare Worker secret.
// Token requires Actions: write access to HLRN-Website only.
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(dispatch(env));
  },
  async fetch() {
    return new Response("HLRN Hosted sync scheduler is configured for cron events.", { status: 200 });
  }
};
async function dispatch(env) {
  if (!env.GITHUB_ACTIONS_TOKEN) throw new Error("Missing GITHUB_ACTIONS_TOKEN Worker secret");
  const res = await fetch("https://api.github.com/repos/hunterwelborn32-creator/HLRN-Website/actions/workflows/sync-hlrn-data.yml/dispatches", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_ACTIONS_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "hlrn-hosted-scheduler"
    },
    body: JSON.stringify({ ref: "main" })
  });
  if (res.status !== 204) {
    const detail = (await res.text()).slice(0, 500);
    throw new Error(`GitHub workflow dispatch failed: HTTP ${res.status} ${detail}`);
  }
  console.log("HLRN sync dispatched");
}
