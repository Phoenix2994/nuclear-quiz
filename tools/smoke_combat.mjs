// End-to-end fights in the browser with scripted dice (window.__PM): the battles of the discovery mode from start to end.
// Usage: node tools/smoke_combat.mjs [baseUrl]   (UI in English; needs `npm i playwright`)
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:8000";
const questions = JSON.parse(readFileSync(new URL("../data/questions-en.json", import.meta.url), "utf8"));
const browser = await chromium.launch();
const errors = [];
const check = (cond, msg) => { console.log(cond ? "  ok  " : "  FAIL", msg); if (!cond) errors.push(msg); };

// dice: [hit roll, damage roll] pairs used for every shot and every creature strike, cycled
async function open(scenario) {
  const page = await browser.newPage({ viewport: { width: 430, height: 960 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript((s) => {
    const v = s.dice; let i = 0;
    window.__PM = { creature: s.creature, level: s.level, fast: true, rng: () => v[i++ % v.length] };
  }, scenario);
  await page.goto(base);
  await page.waitForSelector(".tabs");
  await page.click('.tabs button:has-text("MAP")');
  await page.click(`.chips button:text-is("${scenario.chip}")`);
  await page.click('[data-mode="discover"]');
  const q = page.locator(".pm-frontier").first();
  await q.waitFor();
  const b = await q.locator("circle").boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForSelector(".pm-dest");
  await page.click(".pm-dest .btn.primary");
  await page.waitForSelector(".vats");
  return page;
}
const hp = async (page, sel) => (await page.locator(sel).first().textContent()).trim();
const zone = (page, name) => page.locator(`.vats-zone:has(small:text-is("${name}"))`);
async function quiz(page) { // answer the 3 mission questions correctly
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector(".question");
    const text = (await page.textContent(".question")).trim();
    const q = questions.find((x) => x.q.trim() === text);
    const opts = page.locator(".option");
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

console.log("A. ONE SHOT IS ENOUGH: level-1 radroach (18 HP), head shot for 18, then the quiz");
{
  const page = await open({ creature: "Radroach", level: 1, chip: "FO3", dice: [0.3, 0.5] });
  check((await hp(page, ".vats-hp em")) === "18/18", "intro shows the creature at 18/18");
  check(await page.locator('[data-act="flee"]').isDisabled(), "cannot flee a creature as fast as you (speed 5 vs 4)");
  await page.click('[data-act="fight"]');
  await zone(page, "Head").click();
  check((await page.locator(".vats-pips i.used").count()) === 1, "one shot queued, one pip spent");
  await page.click('[data-act="exec"]');
  await page.waitForSelector(".feedback.ok");
  check((await page.textContent(".feedback strong")).includes("DEFEATED"), "victory after a single shot");
  await page.click(".feedback .btn.primary");
  await quiz(page);
  await page.waitForSelector(".pm-dest, .feedback.ok");
  check((await discovered(page)) === 2, "the place is discovered after the quiz (2 discovered)");
  await page.close();
}

console.log("B. ONE SHOT IS NOT ENOUGH: level-3 feral ghoul (38 HP, torso shots of 9), it hits back, second round");
{
  const page = await open({ creature: "Feral ghoul", level: 3, chip: "FO4", dice: [0.2, 0.5] });
  await page.click('[data-act="fight"]');
  check((await hp(page, ".vats-hp em")) === "38/38", "ghoul starts at 38/38");
  for (let i = 0; i < 3; i++) await zone(page, "Torso").click();
  check((await page.locator(".vats-pips i.used").count()) === 3, "three shots queued");
  await page.click('[data-act="exec"]');
  await page.waitForSelector('.vats-log p:has-text("attacks")');
  await page.waitForFunction(() => document.querySelector('.vats-zone:not([disabled])'), null, { timeout: 15000 });
  const afterRound1 = await hp(page, ".vats-hp em");
  const mine = await hp(page, ".vats-me em");
  console.log("     after round 1: creature", afterRound1, "| me", mine);
  check(afterRound1 === "11/38", "27 damage was not enough: creature at 11/38");
  check(mine === "44/53", "the ghoul hit back for 9: me at 44/53");
  check((await page.locator(".vats-pips i.free").count()) === 4, "action points refilled for round 2");
  await zone(page, "Torso").click(); await zone(page, "Torso").click();
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
  const page = await open({ creature: "Super mutant", level: 6, chip: "FNV", dice: [0.99, 0.5, 0.1, 0.5, 0.1, 0.5, 0.1, 0.5] });
  await page.click('[data-act="fight"]');
  await zone(page, "Head").click();
  await page.click('[data-act="exec"]');
  await page.waitForSelector('.vats-log p:has-text("MISS")');
  check(true, "the first shot is a miss");
  await page.waitForFunction(() => document.querySelector('.vats-zone:not([disabled])'), null, { timeout: 15000 });
  check((await hp(page, ".vats-hp em")).startsWith("68/"), "a miss does no damage (creature still at 68)");
  await page.close();
}

console.log("D. FLEE: a slow brahmin (speed 3) can be outrun");
{
  const page = await open({ creature: "Brahmin", level: 2, chip: "FO3", dice: [0.2, 0.5] });
  check(!(await page.locator('[data-act="flee"]').isDisabled()), "flee is allowed against a slower creature");
  await page.click('[data-act="flee"]');
  await page.waitForSelector(".feedback.ok");
  check((await page.textContent(".feedback strong")).includes("ESCAPED"), "escaped");
  await page.click(".feedback .btn.primary");
  await page.waitForSelector(".feedback.ok:has-text('escaped')");
  check((await discovered(page)) === 1, "nothing discovered after fleeing");
  await page.close();
}

console.log("E. DEFEAT: a level-12 deathclaw kills a rookie");
{
  const page = await open({ creature: "Deathclaw", level: 12, chip: "FNV", dice: [0.0, 0.5] });
  await page.click('[data-act="fight"]');
  await zone(page, "Body").click();
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
