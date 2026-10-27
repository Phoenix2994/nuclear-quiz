// Unit tests of the fight engine: whole battles from start to end, with scripted dice.
// Usage: node tools/test_combat.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newFight, playerFrom, playerShot, creatureTurn, hitChance, fleeInfo, tryFlee, pickCreature, maxShots, bodyOf } from "../assets/pipboy-map.js";

const creatures = JSON.parse(readFileSync(new URL("../data/creatures.json", import.meta.url), "utf8"));
const find = (g, name) => creatures[g].find((c) => c.name === name);
// dice that return the given numbers in order (then repeat the last one)
const dice = (...v) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const rookie = playerFrom({}, undefined); // level 1, every SPECIAL at 1
const log = (...a) => console.log(...a);

// 1. ONE SHOT IS ENOUGH: level-1 radroach (18 HP); a head shot does 9 x2 = 18
{
  const f = newFight(find("fo3", "Radroach"), 1, rookie);
  assert.equal(f.c.hpMax, 18);
  const r = playerShot(f, "head", false, dice(0.3, 0.5)); // hit roll 30 < 46%, damage roll 0.5 -> factor 1.0
  log("1. one shot:", r, "-> creature hp", f.c.hp);
  assert.ok(r.hit && r.killed && f.c.hp === 0);
}

// 2. ONE SHOT IS NOT ENOUGH: level-3 feral ghoul (38 HP), torso shot does 9
{
  const f = newFight(find("fo3", "Feral ghoul"), 3, rookie);
  const r = playerShot(f, "torso", false, dice(0.2, 0.5));
  log("2. one shot, not enough:", r, "-> creature hp", f.c.hp, "/", f.c.hpMax);
  assert.ok(r.hit && !r.killed && f.c.hp === 29);
  // ... and the creature hits back
  const back = creatureTurn(f, dice(0.1, 0.5));
  log("   counter-attack:", back, "-> player hp", f.p.hp, "/", f.p.hpMax);
  assert.ok(back[0].hit && f.p.hp === rookie.hpMax - 9);
}

// 3. A MISS does nothing but still spends AP and charges the critical meter
{
  const f = newFight(find("fo3", "Feral ghoul"), 3, rookie);
  const ap = f.p.ap;
  const r = playerShot(f, "head", false, dice(0.99, 0.5));
  log("3. miss:", r);
  assert.ok(!r.hit && r.dmg === 0 && f.c.hp === f.c.hpMax && f.p.ap === ap - 2 && f.p.crit === 17);
}

// 4. WHOLE BATTLE with several turns: queue of shots, crippling a leg, critical meter, victory
{
  const f = newFight(find("fnv", "Deathclaw"), 4, { ...rookie, level: 3, dmg: 6 + 6 + 3, per: 4, lck: 5, apMax: 12 });
  let turns = 0, shots = 0, won = false;
  const rnd = dice(0.1, 0.5); // always hits, average damage
  while (f.p.hp > 0 && f.c.hp > 0 && turns < 30) {
    turns++;
    const n = maxShots(f);
    for (let i = 0; i < n && f.c.hp > 0; i++) {
      const crit = f.p.crit >= 100;
      const part = f.c.parts.find((p) => !p.crippled && p.max && p.effect === "slow")?.key ?? "torso";
      playerShot(f, part, crit, rnd); shots++;
    }
    if (f.c.hp > 0) { creatureTurn(f, dice(0.99, 0.5)); f.p.ap = f.p.apMax; } // the deathclaw misses
  }
  won = f.c.hp === 0;
  log("4. full battle: shots", shots, "turns", turns, "won", won, "player hp", f.p.hp, "crippled", f.c.parts.filter((p) => p.crippled).map((p) => p.key));
  assert.ok(won && shots > 1);
}

// 5. CRIPPLING A LEG makes the creature slower, which can make it possible to flee
{
  const f = newFight(find("fo3", "Dog"), 3, rookie); // fast dog: speed 8 vs player speed 4
  assert.equal(fleeInfo(f).allowed, false);
  assert.equal(fleeInfo(f).reason, "faster");
  for (let i = 0; i < 6 && !f.c.parts.find((p) => p.key === "fore").crippled; i++) playerShot(f, "fore", false, dice(0, 0.5));
  const legs = f.c.parts.filter((p) => p.crippled).map((p) => p.key);
  log("5. dog after leg shots: crippled", legs, "creature speed", fleeInfo(f).theirs, "player", fleeInfo(f).mine, "-> flee", fleeInfo(f));
  assert.ok(legs.includes("fore"));
  // a slow brahmin (3) can be outrun by a normal player (4) from the start
  const slow = newFight(find("fo3", "Brahmin"), 2, rookie);
  assert.ok(fleeInfo(slow).allowed && fleeInfo(slow).chance >= 60);
  assert.ok(tryFlee(slow, dice(0.1)) && !tryFlee(slow, dice(0.99)));
}

// 6. A BLIND creature (head crippled) misses far more, and can be escaped
{
  const f = newFight(find("fo3", "Super mutant"), 6, rookie);
  const before = creatureTurn(structuredClone(f), dice(0.5, 0.5))[0].chance;
  while (!f.c.parts.find((p) => p.key === "head").crippled) playerShot(f, "head", false, dice(0, 0.5));
  const after = creatureTurn(structuredClone(f), dice(0.5, 0.5))[0].chance;
  log("6. super mutant hit chance before/after blinding:", before, after, "flee", fleeInfo(f).allowed);
  assert.ok(after <= before / 2 + 1 && fleeInfo(f).allowed);
}

// 7. DEFEAT: a level-12 deathclaw kills a rookie
{
  const f = newFight(find("fnv", "Deathclaw"), 12, rookie);
  let rounds = 0;
  while (f.p.hp > 0 && rounds < 20) { rounds++; creatureTurn(f, dice(0, 0.5)); }
  log("7. defeat after", rounds, "rounds, deathclaw damage per strike", 3 + 2 * 12);
  assert.equal(f.p.hp, 0);
}

// 8. HIT CHANCE is capped and grows with Perception, falls with the creature's level
{
  const f = newFight(find("fo3", "Radroach"), 1, { ...rookie, per: 10 });
  assert.ok(f.c.parts.every((p) => hitChance(f, p) <= 95));
  const hard = newFight(find("fnv", "Deathclaw"), 12, rookie);
  const torso = (x) => hitChance(x, x.c.parts.find((p) => p.key === "torso"));
  log("8. torso hit chance: level-1 radroach (PER 10)", torso(f), "| level-12 deathclaw (PER 1)", torso(hard));
  assert.ok(torso(f) > torso(hard));
}

// 9. Which creature appears: weak ones at the start, stronger when more of the map is discovered
{
  const pool = creatures.fnv;
  const early = new Set(Array.from({ length: 200 }, (_, i) => pickCreature(pool, 0, () => (i * 0.37) % 1).creature.level));
  const late = Math.max(...Array.from({ length: 200 }, (_, i) => pickCreature(pool, 60, () => (i * 0.37) % 1).creature.level));
  log("9. creature tiers at the start:", [...early].sort((a, b) => a - b), "| strongest after 60 discoveries:", late);
  assert.ok(Math.max(...early) <= 4 && late >= 7);
  assert.equal(bodyOf(find("fnv", "Deathclaw")), "beast");
}
console.log("combat engine: all battles ok");
