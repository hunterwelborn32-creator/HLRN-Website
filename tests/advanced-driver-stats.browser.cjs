/* Disposable HLRN preview browser smoke checks. No live data is modified. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const BASE = "http://127.0.0.1:8765";
const screenshots = "staging-screenshots";

async function run() {
  fs.mkdirSync(screenshots, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await desktop.newPage();
    await page.goto(BASE + "/stats/", { waitUntil: "domcontentloaded" });
    await page.locator("#adsRecords .ads-record").first().waitFor({ timeout: 30000 });
    assert.equal(await page.locator("#adsRecords .ads-record").count(), 6);
    assert.ok((await page.locator("#adsRecords").innerText()).includes("Hosted Racing"));
    await page.screenshot({ path: screenshots + "/desktop-records-light.png", fullPage: true });
    console.log("PASS records leaderboard, separate Hosted totals");

    await page.goto(BASE + "/drivers/trevor-haley/", { waitUntil: "domcontentloaded" });
    await page.locator("#hlrnAdvancedStats .ads-card").first().waitFor({ timeout: 30000 });
    assert.ok((await page.locator("#hlrnAdvancedStats").innerText()).includes("Track-by-Track Performance"));
    assert.ok((await page.locator("#hlrnAdvancedStats").innerText()).includes("Full Recorded Race History"));
    await page.screenshot({ path: screenshots + "/desktop-driver-light.png", fullPage: true });
    await page.locator("#hlrnAdvancedStats [data-ads-series]").selectOption("hosted");
    assert.ok((await page.locator("#hlrnAdvancedStats").innerText()).includes("Hosted Racing"));
    console.log("PASS permanent driver profile and Hosted filter");

    // Override only HTTP response in browser: no repository or live-data write.
    const fixture = JSON.parse(fs.readFileSync("data/derived/profiles.json", "utf8"));
    const driver = fixture.drivers.find(p => p.series === "sunday" && p.name === "Trevor Haley");
    assert.ok(driver);
    const expected = driver.results.filter(r => Number(r.finish) === 1).length + 1;
    driver.results.push({
      raceId: "STAGING-TEST-ONLY", raceNumber: 999, track: "Temporary Test Track",
      date: "2026-12-15T04:00:00.000Z", start: 3, finish: 1,
      points: 50, lapsLed: 5, incidents: 0, status: "Running"
    });
    await page.route("**/data/derived/profiles.json", route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) })
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#hlrnAdvancedStats .ads-card").first().waitFor({ timeout: 30000 });
    const winText = await page.locator("#hlrnAdvancedStats .ads-card").nth(1).locator("b").innerText();
    assert.equal(Number(winText), expected);
    assert.ok((await page.locator("#hlrnAdvancedStats").innerText()).includes("Temporary Test Track"));
    console.log("PASS simulated race result updates stats and race history");

    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1
    });
    await mobile.addInitScript(() => localStorage.setItem("hlrn_site_theme_v2", "dark"));
    const mp = await mobile.newPage();
    await mp.goto(BASE + "/drivers/trevor-haley/", { waitUntil: "domcontentloaded" });
    await mp.locator("#hlrnAdvancedStats .ads-card").first().waitFor({ timeout: 30000 });
    assert.equal(await mp.locator("html").getAttribute("data-hlrn-theme"), "dark");
    const bounds = await mp.locator("#hlrnAdvancedStats").boundingBox();
    assert.ok(bounds && bounds.width <= 400, "advanced stats fits mobile width");
    await mp.screenshot({ path: screenshots + "/mobile-driver-dark.png", fullPage: true });
    await mp.goto(BASE + "/stats/", { waitUntil: "domcontentloaded" });
    await mp.locator("#adsRecords .ads-record").first().waitFor({ timeout: 30000 });
    await mp.screenshot({ path: screenshots + "/mobile-records-dark.png", fullPage: true });
    console.log("PASS mobile dark-mode driver and record pages");
    await mobile.close();
    await desktop.close();
  } finally {
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
