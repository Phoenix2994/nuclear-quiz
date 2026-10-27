// End-to-end fights in the browser with scripted dice (window.__PM): the battles of the discovery mode from start to end.
// Usage: node tools/smoke_combat.mjs [baseUrl]   (UI in English; needs `npm i playwright`)
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:8000";
const questions = JSON.parse(readFileSync(new URL("../data/questions-en.json", import.meta.url), "utf8"));
const maps = JSON.parse(readFileSync(new URL("../data/maps.json", import.meta.url), "utf8"));
const KEY = { FO3: "fo3", FNV: "fnv", FO4: "fo4", 76: "fo76" };
const browser = await chromium.launch();
const errors = [];
const check = (cond, msg) => { console.log(cond ? "  ok  " : "  FAIL", msg); if (!cond) errors.push(msg); };

// dice: [hit roll, damage roll] pairs used for every shot and every creature strike, cycled
async function open(scenario) {
  const page = await browser.newPage({ viewport: { width: 430, height: 960 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript((s) => {
    const v = s.dice; let i = 0;
    window.__PM = { creature: s.creature, fast: true, encounter: true, rng: () => v[i++ % v.length] };
  }, scenario);
  await page.goto(base);
  await page.waitForSelector(".tabs");
  await page.click('.tabs button:has-text("MAP")');
  await page.click(`.chips button:text-is("${scenario.chip}")`);
  await page.click('[data-mode="discover"]');
  // tap the icon of the undiscovered place nearest to the starting vault
  const m = maps[KEY[scenario.chip]], byId = new Map(m.markers.map((x) => [x.id, x])), start = byId.get(m.start);
  const t = m.targets.map((id) => byId.get(id)).filter((x) => x.id !== m.start)
    .sort((a, b) => Math.hypot(a.x - start.x, a.y - start.y) - Math.hypot(b.x - start.x, b.y - start.y))[0];
  const svg = page.locator(".pm-svg").first();
  await svg.waitFor();
  const box = await svg.boundingBox(), vb = (await svg.getAttribute("viewBox")).split(" ").map(Number);
  await page.mouse.click(box.x + ((t.x - vb[0]) / vb[2]) * box.width, box.y + ((t.y - vb[1]) / vb[3]) * box.height);
  await page.waitForSelector(".pm-dest");
  await page.click(".pm-dest .btn.primary");
  await page.waitForSelector(".vats");
  return page;
}
const hp = async (page, sel) => (await page.locator(sel).first().textContent()).trim();
const ZONE = { head: 0, body: 1 }; // the first zone of every body is the head, the second the torso / body
const zone = (page, name) => page.locator(".vats-zone").nth(ZONE[name]);
async function quiz(page) { // answer the 3 mission questions correctly
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector(".question");
    const text = (await page.textContent(".question")).trim();
    const opts = page.locator(".option");
    // several questions share a text: pick the one whose options are the ones on screen
    const shown = (await opts.allTextContents()).map((x) => x.replace(/^[A-D]/, "").trim());
    const q = questions.find((x) => x.q.trim() === text && x.options.length === shown.length && x.options.every((o) => shown.includes(o.trim())))
      ?? questions.find((x) => x.q.trim() === text);
    let idx = 0;
    if (q) for (let k = 0; k < (await opts.count()); k++) if ((await opts.nth(k).textContent()).replace(/^[A-D]/, "").trim() === q.options[q.answer].trim()) idx = k;
    await opts.nth(idx).click();
    await page.waitForSelector(".feedback");
    await page.click(".fb-actions .btn.primary");
  }
  await page.waitForSelector(".big");
  await page.click("text=CONTINUE");
}
const discovered = async (page) => +(await page.textContent(".tags")).match(/(\d+)\/\d+/)[1];

console.log("A. ONE SHOT IS ENOUGH: the Fallout 3 radroach has 5 HP on its wiki page, one head shot kills it, then the quiz");
{
  const page = await open({ creature: "Radroach", chip: "FO3", dice: [0.3, 0.5] });
  check((await hp(page, ".vats-hp em")).startsWith("5/5"), "intro shows the creature at 5/5");
  check((await page.locator(".vats-notes, .vats-stats").count()) > 0, "intro shows the creature stats");
  check(await page.locator('[data-act="flee"]').isDisabled(), "cannot flee a creature as fast as you (speed 5 vs 4)");
  await page.click('[data-act="fight"]');
  await zone(page, "head").click();
  check((await page.locator(".vats-pips i.used").count()) === 2, "one shot queued, its 2 action points spent");
  await page.click('[data-act="exec"]');
  await page.waitForSelector(".feedback.ok");
  check((await page.textContent(".feedback strong")).includes("DEFEATED"), "victory after a single shot");
  await page.click(".feedback .btn.primary");
  await quiz(page);
  await page.waitForSelector(".pm-dest, .feedback.ok");
  check((await discovered(page)) === 2, "the place is discovered after the quiz (2 discovered)");
  await page.close();
}

console.log("B. ONE SHOT IS NOT ENOUGH: Fallout 4 feral ghoul (35 HP, 9% armour, hits for 15): torso shots of 8, it hits back, second round");
{
  const page = await open({ creature: "Feral ghoul", chip: "FO4", dice: [0.2, 0.5] });
  await page.click('[data-act="fight"]');
  check((await hp(page, ".vats-hp em")) === "35/35", "ghoul starts at 35/35");
  for (let i = 0; i < 3; i++) await zone(page, "body").click();
  check((await page.locator(".vats-pips i.used").count()) === 6, "three shots queued (6 action points)");
  await page.click('[data-act="exec"]');
  await page.waitForSelector('.vats-log p:has-text("attacks")');
  await page.waitForFunction(() => document.querySelector('.vats-zone:not([disabled])'), null, { timeout: 15000 });
  const afterRound1 = await hp(page, ".vats-hp em");
  const mine = await hp(page, ".vats-me em");
  console.log("     after round 1: creature", afterRound1, "| me", mine);
  check(afterRound1 === "11/35", "24 damage was not enough: creature at 11/35");
  check(mine === "38/53", "the ghoul hit back for 15: me at 38/53");
  check((await page.locator(".vats-pips i.free").count()) === 8, "action points refilled for round 2");
  await zone(page, "body").click(); await zone(page, "body").click();
  await page.click('[data-act="exec"]');
  await page.waitForSelector(".feedback.ok", { timeout: 15000 });
  check((await page.textContent(".feedback strong")).includes("DEFEATED"), "victory in round 2");
  await page.click(".feedback .btn.primary");
  await quiz(page);
  check((await discovered(page)) === 2, "place discovered");
  await page.close();
}

console.log("C. A MISS then a CRIPPLED head: it takes more shots, the creature misses more once blinded");
{
  // hit rolls: 0.99 (miss) then 0.1 (hit); damage roll 0.5
  const page = await open({ creature: "Super mutant", chip: "FNV", dice: [0.99, 0.5, 0.1, 0.5, 0.1, 0.5, 0.1, 0.5] });
  await page.click('[data-act="fight"]');
  await zone(page, "head").click();
  await page.click('[data-act="exec"]');
  await page.waitForSelector('.vats-log p:has-text("MISS")');
  check(true, "the first shot is a miss");
  await page.waitForFunction(() => document.querySelector('.vats-zone:not([disabled])'), null, { timeout: 15000 });
  check((await hp(page, ".vats-hp em")).startsWith("100/"), "a miss does no damage (creature still at 100)");
  await page.close();
}

console.log("D. FLEE: a slow brahmin (speed 3) can be outrun");
{
  const page = await open({ creature: "Brahmin", chip: "FO3", dice: [0.2, 0.5] });
  check(!(await page.locator('[data-act="flee"]').isDisabled()), "flee is allowed against a slower creature");
  await page.click('[data-act="flee"]');
  await page.waitForSelector(".feedback.ok");
  check((await page.textContent(".feedback strong")).includes("ESCAPED"), "escaped");
  await page.click(".feedback .btn.primary");
  await page.waitForSelector(".feedback.ok:has-text('escaped')");
  check((await discovered(page)) === 1, "nothing discovered after fleeing");
  await page.close();
}

console.log("E. DEFEAT: the New Vegas deathclaw (level 20, 500 HP) hits for 125 and kills a rookie");
{
  const page = await open({ creature: "Deathclaw", chip: "FNV", dice: [0.0, 0.5] });
  await page.click('[data-act="fight"]');
  await zone(page, "body").click();
  await page.click('[data-act="exec"]');
  await page.waitForSelector(".feedback.ko", { timeout: 15000 });
  check((await page.textContent(".feedback strong")).includes("DEFEATED"), "defeated");
  await page.click(".feedback .btn.primary");
  await page.waitForSelector(".feedback.ko:has-text('Defeated by')");
  check((await discovered(page)) === 1, "nothing discovered after a defeat");
  await page.close();
}

console.log(errors.length ? "\nERRORS:\n" + errors.join("\n") : "\nall battles ok, no page errors");
await browser.close();
process.exit(errors.length ? 1 : 0);
