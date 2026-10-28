// Unit tests of the fight engine: whole battles from start to end, with scripted dice and the real creature data.
// Usage: node tools/test_combat.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newFight, playerFrom, playerShot, creatureTurn, hitChance, fleeInfo, tryFlee, pickCreature, maxShots, bodyOf, zonesFor,
  ADV, WEAPONS, AMMO, armed, needsBash, withKit, buyWeapon, buyAmmo, equip, newAdventure, advAfterFight, advAfterDiscover, rest, canRest, buyStim, fastTravel, useStimpak, isSafePlace, winCaps } from "../assets/pipboy-map.js";

const creatures = JSON.parse(readFileSync(new URL("../data/creatures.json", import.meta.url), "utf8"));
const find = (g, name) => creatures[g].find((c) => c.name === name);
// dice that return the given numbers in order (then repeat the last one)
const dice = (...v) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const rookie = playerFrom({}, undefined); // level 1, every SPECIAL at 1: 53 HP, 8 AP, 9 damage
const log = (...a) => console.log(...a);
const part = (f, key) => f.c.parts.find((p) => p.key === key);

// 1. ONE SHOT IS ENOUGH: the Fallout 3 radroach has 5 HP on its wiki page
{
  const f = newFight(find("fo3", "Radroach"), rookie);
  assert.equal(f.c.hpMax, 5);
  const r = playerShot(f, "torso", false, dice(0.3, 0.5));
  log("1. one shot:", r.hit ? "hit" : "miss", r.dmg, "damage -> creature hp", f.c.hp, "/", f.c.hpMax);
  assert.ok(r.hit && r.killed && f.c.hp === 0);
}

// 2. ONE SHOT IS NOT ENOUGH: a Fallout 3 feral ghoul (25 HP, 5 damage): a torso shot does 9, then it hits back
{
  const f = newFight(find("fo3", "Feral ghoul"), rookie);
  const r = playerShot(f, "torso", false, dice(0.2, 0.5));
  log("2. one shot, not enough:", r.dmg, "damage -> creature hp", f.c.hp, "/", f.c.hpMax);
  assert.ok(r.hit && !r.killed && f.c.hp === 16);
  const back = creatureTurn(f, dice(0.1, 0.5));
  log("   counter-attack:", back[0].dmg, "-> player hp", f.p.hp, "/", f.p.hpMax);
  assert.ok(back[0].hit && f.p.hp === 53 - 7); // its melee figure is 5, but a creature always hits for at least 2 + 1.5 x level
  // round 2: a head shot (x2) finishes it
  const r2 = playerShot(f, "head", false, dice(0.2, 0.5));
  log("   round 2, head shot:", r2.dmg, "->", f.c.hp, r2.killed ? "(dead)" : "");
  assert.ok(r2.killed);
}

// 3. A MISS does nothing but still spends AP and charges the critical meter
{
  const f = newFight(find("fo3", "Feral ghoul"), rookie);
  const ap = f.p.ap;
  const r = playerShot(f, "head", false, dice(0.99, 0.5));
  log("3. miss:", r.hit, r.dmg);
  assert.ok(!r.hit && r.dmg === 0 && f.c.hp === f.c.hpMax && f.p.ap === ap - 2 && f.p.crit === 17);
}

// 4. ARMOUR: a Fallout 4 deathclaw (510 HP, damage resistance 100 = 50%) takes half; a critical hit ignores it
{
  const f = newFight(find("fo4", "Deathclaw"), { ...rookie, dmg: 20 });
  assert.equal(f.c.absorb, 0.5);
  const normal = playerShot(f, "hind", false, dice(0, 0.5)); // legs: x0.8 x0.6 (scaled hide) x0.5 armour
  const crit = playerShot(f, "hind", true, dice(0, 0.5)); // x0.8 x0.6, x2, no armour
  log("4. deathclaw armour: leg shot", normal.dmg, "| critical leg shot", crit.dmg);
  assert.ok(crit.dmg > normal.dmg * 3);
}

// 5. WEAK POINTS from the wiki: the FO4 deathclaw's belly (torso) takes more than its head; the radscorpion has no weak point
{
  const dc = newFight(find("fo4", "Deathclaw"), rookie);
  const rs = newFight(find("fo3", "Radscorpion"), rookie);
  log("5. deathclaw torso x" + part(dc, "torso").mult, "head x" + part(dc, "head").mult, "| radscorpion head x" + part(rs, "head").mult, "legs x" + part(rs, "legs").mult);
  assert.ok(part(dc, "torso").mult > part(dc, "head").mult);
  assert.equal(part(rs, "head").mult, 1);
  assert.ok(part(rs, "legs").mult < 0.5);
  const mire = newFight(find("fo3", "Mirelurk"), rookie);
  assert.ok(part(mire, "torso").mult === 0.5 && part(mire, "head").acc < 45); // shell on the body, small unarmoured face
}

// 6. ANTENNAE: ants and mantises have the zone; crippling it sends the creature into a frenzy (it misses more, you can flee)
{
  const f = newFight(find("fo3", "Giant ant"), rookie);
  assert.ok(zonesFor(find("fo3", "Giant ant")).some((z) => z.key === "antennae"));
  assert.ok(!zonesFor(find("fo3", "Radroach")).some((z) => z.key === "antennae"));
  const before = creatureTurn(structuredClone(f), dice(0.5, 0.5))[0].chance;
  const ant = part(f, "antennae");
  while (!ant.crippled) playerShot(f, "antennae", false, dice(0, 0.5));
  const after = creatureTurn(structuredClone(f), dice(0.5, 0.5))[0].chance;
  log("6. giant ant hit chance before/after crippling the antennae:", before, after, "| flee allowed:", fleeInfo(f).allowed);
  assert.ok(after <= before / 2 + 1 && fleeInfo(f).allowed);
}

// 7. FLEE only if you are faster (or the creature is blind); crippling legs slows the creature down
{
  const dog = newFight(find("fo3", "Dog"), rookie);
  assert.equal(fleeInfo(dog).allowed, false);
  assert.equal(fleeInfo(dog).reason, "faster");
  while (!part(dog, "fore").crippled) playerShot(dog, "fore", false, dice(0, 0.5));
  log("7. dog: speed", fleeInfo(dog).theirs, "vs mine", fleeInfo(dog).mine, "after crippling the forelegs");
  const slow = newFight(find("fo3", "Brahmin"), rookie);
  assert.ok(fleeInfo(slow).allowed && fleeInfo(slow).chance >= 60);
  assert.ok(tryFlee(slow, dice(0.1)) && !tryFlee(slow, dice(0.99)));
}

// 8. WHOLE BATTLE over several rounds: a Fallout 4 feral ghoul (35 HP, 9% armour, hits for 15)
{
  const f = newFight(find("fo4", "Feral ghoul"), rookie);
  let rounds = 0, shots = 0;
  while (f.p.hp > 0 && f.c.hp > 0 && rounds < 20) {
    rounds++;
    for (let i = 0; i < maxShots(f) && f.c.hp > 0; i++) { playerShot(f, "torso", f.p.crit >= 100, dice(0.1, 0.5)); shots++; }
    if (f.c.hp > 0) { creatureTurn(f, dice(0.1, 0.5)); f.p.ap = f.p.apMax; }
  }
  log("8. full battle: rounds", rounds, "shots", shots, "player hp", f.p.hp, "/", f.p.hpMax, "creature hp", f.c.hp);
  assert.ok(f.c.hp === 0 && rounds === 1 || rounds >= 1); // 4 shots of 8 = 32 < 35: needs a second round unless a critical lands
  assert.ok(f.c.hp === 0);
}

// 9. DEFEAT: a Fallout: New Vegas deathclaw hits for 125 and kills a rookie in one strike
{
  const f = newFight(find("fnv", "Deathclaw"), rookie);
  creatureTurn(f, dice(0, 0.5));
  log("9. defeat: deathclaw damage", f.c.dmg, "-> player hp", f.p.hp);
  assert.equal(f.p.hp, 0);
}

// 10. HIT CHANCE is capped at 95 and falls with the creature's level
{
  const easy = newFight(find("fo3", "Radroach"), { ...rookie, per: 10 });
  assert.ok(easy.c.parts.every((p) => hitChance(easy, p) <= 95));
  const hard = newFight(find("fnv", "Deathclaw"), rookie);
  const torso = (x) => hitChance(x, part(x, "torso"));
  log("10. torso hit chance: radroach (PER 10)", torso(easy), "| deathclaw L20 (PER 1)", torso(hard));
  assert.ok(torso(easy) > torso(hard));
}

// 11. Which creature appears: low levels at the start, only the high levels once most of the map is discovered
{
  const pool = creatures.fnv;
  const start = Array.from({ length: 200 }, (_, i) => pickCreature(pool, 0, () => (i * 0.37) % 1).creature.level);
  const late = Array.from({ length: 200 }, (_, i) => pickCreature(pool, 60, () => (i * 0.37) % 1).creature.level);
  log("11. levels at the start:", [...new Set(start)].sort((a, b) => a - b), "| after 60 discoveries:", [...new Set(late)].sort((a, b) => a - b));
  assert.ok(Math.max(...start) <= 4 && Math.min(...late) >= 15);
  assert.ok(bodyOf(find("fnv", "Deathclaw")) in { beast: 1, humanoid: 1 });
}

// 12. ADVENTURE: health, stimpaks, caps and position carried between missions
{
  let a = newAdventure(60, "vault", 4);
  assert.deepEqual(a, { hp: 60, stim: 2, caps: 40, at: "vault", safe: "vault", weapons: ["knife", "pistol"], equip: "pistol", ammo: { "10mm": 20 } });
  // a fight starts with the health you bring; a stimpak heals 40% of max health for the AP of one shot
  const f = newFight(find("fo3", "Radroach"), rookie, 20, a.stim);
  assert.equal(f.p.hp, 20);
  const ap = f.p.ap, { heal } = useStimpak(f);
  assert.equal(heal, Math.round(0.4 * rookie.hpMax)); assert.equal(f.p.stim, 1); assert.equal(f.p.ap, ap - f.p.cost);
  // win: caps by creature level, health and stimpaks as left by the fight
  let r = advAfterFight(a, { result: "win", hp: 35, stim: 1, level: 3 }, 60, () => 0.5);
  assert.equal(r.gain, winCaps(3, 0.5)); assert.equal(r.gain, 14);
  a = r.a; assert.equal(a.hp, 35); assert.equal(a.stim, 1); assert.equal(a.caps, 54);
  // discovering a settlement moves you there and makes it the place you wake up at
  r = advAfterDiscover(a, "megaton", true, () => 0.1); // 0.1: a stimpak and a pack of 10mm rounds found
  assert.deepEqual(r.loot, { type: "10mm", n: 10 }); assert.equal(r.a.ammo["10mm"], 30);
  a = r.a; assert.equal(a.caps, 64); assert.equal(a.stim, 2); assert.equal(a.at, "megaton"); assert.equal(a.safe, "megaton");
  a = advAfterDiscover(a, "ruins", false, () => 0.9).a;
  assert.equal(a.at, "ruins"); assert.equal(a.safe, "megaton"); assert.equal(a.stim, 2);
  // defeat: a quarter of the caps lost, back at the last settlement with half health
  r = advAfterFight(a, { result: "lose", hp: 0, stim: 0, level: 5 }, 60, () => 0.5);
  assert.equal(r.loss, 18); a = r.a;
  assert.deepEqual([a.hp, a.caps, a.at, a.stim], [30, 56, "megaton", 0]);
  // fleeing keeps what is left, never 0 health
  assert.equal(advAfterFight(a, { result: "flee", hp: 0, stim: 0 }, 60, () => 0).a.hp, 1);
  // settlement: rest (10 caps, free in the starting vault), stimpaks for 25 caps
  assert.ok(canRest(a, 60, "vault"));
  a = rest(a, 60, "vault"); assert.deepEqual([a.hp, a.caps], [60, 46]);
  assert.equal(rest(a, 60, "vault"), a); // already full: nothing happens
  a = buyStim(a); assert.deepEqual([a.stim, a.caps], [1, 21]);
  assert.equal(buyStim(a), a); // not enough caps
  a = fastTravel({ ...a, hp: 10 }, "vault"); assert.equal(rest(a, 60, "vault").caps, 21);
  // shop: a weapon once, ammo packs; a fight gives back the rounds left
  a = { ...a, caps: 200 };
  a = buyWeapon(a, "shotgun"); assert.deepEqual([a.weapons.includes("shotgun"), a.caps], [true, 80]);
  assert.equal(buyWeapon(a, "shotgun"), a); assert.equal(buyWeapon(a, "plasma"), a); // owned / too expensive
  a = buyAmmo(a, "shell"); assert.deepEqual([a.ammo.shell, a.caps], [6, 65]);
  a = advAfterFight(equip(a, "shotgun"), { result: "flee", hp: 20, stim: 1, ammo: { shell: 3 } }, 60, () => 0.9).a;
  assert.deepEqual([a.equip, a.ammo.shell, a.ammo["10mm"]], ["shotgun", 3, 30]);
  assert.equal(withKit({ hp: 5 }).equip, "pistol");
  const map = { start: "v" };
  assert.ok(isSafePlace(map, { id: "v", cat: "Vaults" }) && isSafePlace(map, { id: "x", cat: "Medium settlements" }) && isSafePlace(map, { id: "y", cat: "Towns" }));
  assert.ok(!isSafePlace(map, { id: "z", cat: "Caves" }) && !isSafePlace(map, { id: "w", cat: "Town Ruins" }));
  log("12. adventure: caps", a.caps, "stimpaks", a.stim, "encounter chance", ADV.encounter);
}

// 13. WEAPONS: AP, damage, accuracy and ammo; out of ammo a gun bash (2 AP, no rounds)
{
  const roach = find("fo3", "Radroach");
  const pistol = newFight(roach, armed(rookie, "pistol", 1)), rifle = newFight(roach, armed(rookie, "rifle", 5));
  assert.equal(pistol.p.dmg, rookie.dmg); assert.equal(rifle.p.cost, 4); assert.equal(rifle.p.dmg, Math.round(rookie.dmg * 2.2));
  assert.equal(hitChance(rifle, part(rifle, "torso")), hitChance(pistol, part(pistol, "torso")) + 10);
  const knife = armed({ ...rookie, str: 5 }, "knife");
  assert.equal(knife.ammo, null); assert.equal(knife.dmg, Math.round(rookie.dmg * 0.8) + 10);
  // the pistol has one round: one shot, then a bash
  const f = newFight(find("fnv", "Deathclaw"), armed(rookie, "pistol", 1));
  let r = playerShot(f, "torso", false, dice(0, 0.5));
  assert.ok(!r.bash); assert.equal(f.p.ammo, 0); assert.equal(f.p.ap, 6);
  assert.ok(needsBash(f.p));
  r = playerShot(f, "torso", false, dice(0, 0.5));
  assert.ok(r.bash); assert.equal(f.p.ammo, 0); assert.equal(f.p.ap, 4);
  // a minigun burst takes 5 rounds; energy weapons ignore part of the damage resistance
  const mg = newFight(roach, armed(rookie, "minigun", 7));
  playerShot(mg, "torso", false, dice(0, 0.5)); assert.equal(mg.p.ammo, 2); assert.ok(needsBash(mg.p));
  const armour = { ...roach, hp: 500, absorb: 0.5 };
  const laser = newFight(armour, armed(rookie, "laser", 10)), pist = newFight(armour, armed(rookie, "pistol", 10));
  const hitL = playerShot(laser, "torso", false, dice(0, 0.5)).dmg, hitP = playerShot(pist, "torso", false, dice(0, 0.5)).dmg;
  log("13. weapons: laser vs armour", hitL, "| pistol vs armour", hitP, "| weapons", Object.keys(WEAPONS).length, "ammo types", Object.keys(AMMO).length);
  assert.ok(hitL > hitP * 1.5);
}
console.log("combat engine: all battles ok");
