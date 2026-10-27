// Smoke test of the MAP tab: every mode on every map (the UI must be in English, the default).
// Usage: node tools/smoke_map.mjs [baseUrl]   (needs `npm i playwright`)
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:8000";
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const maps = read("../data/maps.json");
const questions = read("../data/questions-en.json");
const short = { fo3: "FO3", fnv: "FNV", fo4: "FO4", fo76: "76" };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const check = (cond, msg) => { if (!cond) { errors.push("FAIL: " + msg); console.log("FAIL:", msg); } };

// scripted dice: every shot and every strike hits for average damage (see tools/smoke_combat.mjs for real fights)
await page.addInitScript(() => {
  const v = [0.1, 0.5]; let i = 0;
  window.__PM = { level: 1, fast: true, rng: () => v[i++ % 2] };
});
await page.goto(base);
await page.waitForSelector(".tabs");
await page.click('.tabs button:has-text("MAP")');

async function openMap(key) {
  const m = maps[key];
  await page.click(`.chips button:text-is("${short[m.group]}")`);
  if (key !== m.group) await page.click(`.chips button:text-is("${m.short}")`);
}
const svgBox = async () => {
  const svg = page.locator(".pm-svg").first();
  return { box: await svg.boundingBox(), vb: (await svg.getAttribute("viewBox")).split(" ").map(Number) };
};
async function tapMap(mx, my) {
  const { box, vb } = await svgBox();
  const px = box.x + ((mx - vb[0]) / vb[2]) * box.width, py = box.y + ((my - vb[1]) / vb[3]) * box.height;
  await page.mouse.click(Math.min(box.x + box.width - 60, Math.max(box.x + 5, px)), Math.min(box.y + box.height - 5, Math.max(box.y + 5, py)));
}
const marker = (key, name) => maps[key].markers.find((m) => m.name.trim() === name);

// 1. find the place: right spot on even rounds, a far corner on odd ones
async function findMode(key) {
  await page.click('[data-mode="find"]');
  const rounds = Math.min(10, maps[key].targets.length);
  for (let i = 0; i < rounds; i++) {
    await page.waitForSelector(".pm-target");
    const t = marker(key, (await page.textContent(".pm-target")).trim());
    const { vb } = await svgBox();
    await (i % 2 === 0 ? tapMap(t.x, t.y) : tapMap(vb[0] + vb[2] * 0.1, vb[1] + vb[3] * 0.9));
    await page.waitForSelector(".feedback");
    await page.click(".fb-actions .btn.primary");
  }
  await page.waitForSelector(".big");
  console.log(key, "find: score", await page.textContent(".big"));
  await page.click("text=CONTINUE");
}

// 2 and 5. multiple choice: pick the first option, expect a verdict each round
async function choiceMode(key, mode) {
  await page.click(`[data-mode="${mode}"]`);
  const rounds = Math.min(10, maps[key].targets.length);
  for (let i = 0; i < rounds; i++) {
    await page.waitForSelector(".option");
    const n = await page.locator(".option").count();
    check(n >= 2, `${key} ${mode}: ${n} options`);
    await page.locator(".option").first().click();
    await page.waitForSelector(".feedback");
    await page.click(".fb-actions .btn.primary");
  }
  await page.waitForSelector(".big");
  console.log(key, mode + ": score", await page.textContent(".big"));
  await page.click("text=CONTINUE");
}

// fight the creature of a mission: queue body shots until the action points are spent, execute, repeat until it falls
async function winFight() {
  await page.waitForSelector(".vats");
  await page.click('[data-act="fight"]');
  for (let round = 0; round < 12; round++) {
    while ((await page.locator(".vats-pips i.free").count()) > 0) await page.locator(".vats-zone").nth(1).click(); // the body zone
    await page.click('[data-act="exec"]');
    await page.waitForFunction(() => document.querySelector(".feedback.ok") || document.querySelector('.vats-zone:not([disabled])'), null, { timeout: 20000 });
    if (await page.locator(".feedback.ok").count()) break;
  }
  await page.click(".feedback .btn.primary");
}

// 3. discover: travel to a destination and answer the mission with the right answers
async function discoverMode(key, pass) {
  await page.click('[data-mode="discover"]');
  const before = (await page.textContent(".tags")).match(/(\d+)\/(\d+)/)[1];
  // tap a "?" marker
  const q = page.locator(".pm-frontier").first();
  await q.waitFor();
  const b = await q.locator("circle").boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForSelector(".pm-dest");
  await page.click(".pm-dest .btn.primary");
  await winFight();
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector(".question");
    const text = (await page.textContent(".question")).trim();
    const q = questions.find((x) => x.q.trim() === text);
    const right = q && q.options[q.answer];
    const opts = page.locator(".option");
    let idx = 0;
    // exact match on the option text (it is prefixed by the letter A-D)
    if (q) for (let k = 0; k < (await opts.count()); k++) if ((await opts.nth(k).textContent()).replace(/^[A-D]/, "").trim() === right.trim()) idx = k;
    if (!pass) idx = (idx + 1) % (await opts.count()); // wrong on purpose
    await opts.nth(idx).click();
    await page.waitForSelector(".feedback");
    await page.click(".fb-actions .btn.primary");
  }
  await page.waitForSelector(".big");
  await page.click("text=CONTINUE");
  await page.waitForSelector(".progressbar");
  const after = (await page.textContent(".tags")).match(/(\d+)\/(\d+)/)[1];
  console.log(key, "discover:", before, "->", after, pass ? "(expected +1)" : "(expected same)");
  check(pass ? +after === +before + 1 : after === before, `${key} discover ${before}->${after}`);
  await page.click(".topbar .link");
}

// 4. explorer: tap a marker, its name must appear
async function exploreMode(key) {
  await page.click('[data-mode="explore"]');
  const t = maps[key].markers.find((m) => maps[key].targets.includes(m.id));
  // zoom in around it first so the tap radius cannot hit a neighbour
  for (let i = 0; i < 5; i++) {
    const { box, vb } = await svgBox();
    await page.mouse.move(box.x + ((t.x - vb[0]) / vb[2]) * box.width, box.y + ((t.y - vb[1]) / vb[3]) * box.height);
    await page.mouse.wheel(0, -100);
  }
  await tapMap(t.x, t.y);
  await page.waitForSelector(".feedback strong");
  const name = (await page.textContent(".feedback strong")).trim();
  check(name.length > 0, `${key} explorer shows a name`);
  console.log(key, "explorer: tapped", t.name.trim(), "->", name);
  await page.click(".topbar .link");
}

for (const key of Object.keys(maps)) {
  await openMap(key);
  await findMode(key);
}
for (const key of ["fo4", "fnv", "fo3", "fnvhh", "fo76"]) {
  await openMap(key);
  await choiceMode(key, "place");
  if (key !== "fo76") await choiceMode(key, "icon");
  await exploreMode(key);
}
await openMap("fo4"); await discoverMode("fo4", true);
await openMap("fo4"); await discoverMode("fo4", false);
await openMap("fnv"); await discoverMode("fnv", true);
await openMap("fo76"); await discoverMode("fo76", true);

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "all modes ok, no page errors");
await browser.close();
process.exit(errors.length ? 1 : 0);
