// Smoke test of the MAP tab: plays 10 rounds per game (taps the right spot on even rounds).
// Usage: node tools/smoke_map.mjs [baseUrl]   (needs `npm i playwright`)
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:8000";
const maps = JSON.parse(readFileSync(new URL("../data/maps.json", import.meta.url), "utf8"));
const short = { fo3: "FO3", fnv: "FNV", fo4: "FO4", fo76: "76" };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(base);
await page.waitForSelector(".tabs");
await page.click('.tabs button:has-text("MAP")');

for (const g of Object.keys(maps)) {
  await page.click(`.chips button:has-text("${short[g]}")`);
  await page.click("text=/START|INIZIA/");
  let ok = 0;
  for (let i = 0; i < 10; i++) {
    await page.waitForSelector(".pm-target");
    const name = (await page.textContent(".pm-target")).trim();
    const t = maps[g].markers.find((m) => m.name.trim() === name);
    const svg = page.locator(".pm-svg").first();
    const box = await svg.boundingBox();
    const vb = (await svg.getAttribute("viewBox")).split(" ").map(Number);
    // right spot on even rounds, a far corner on odd ones (corner may be outside the view: clamp)
    const [mx, my] = i % 2 === 0 ? [t.x, t.y] : [vb[0] + vb[2] * 0.1, vb[1] + vb[3] * 0.9];
    const px = box.x + ((mx - vb[0]) / vb[2]) * box.width, py = box.y + ((my - vb[1]) / vb[3]) * box.height;
    await page.mouse.click(Math.min(box.x + box.width - 60, Math.max(box.x + 5, px)), Math.min(box.y + box.height - 5, Math.max(box.y + 5, py)));
    await page.waitForSelector(".feedback");
    if ((await page.textContent(".feedback strong")).trim().match(/CORRECT|CORRETTO/)) ok++;
    await page.click(".fb-actions .btn.primary");
  }
  await page.waitForSelector(".big");
  console.log(g, "score", await page.textContent(".big"), `(${ok} correct taps)`);
  await page.click("text=/CONTINUE|CONTINUA/");
}
console.log(errors.length ? "ERRORS: " + errors.join("\n") : "no page errors");
await browser.close();
process.exit(errors.length ? 1 : 0);
