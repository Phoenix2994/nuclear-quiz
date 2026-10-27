# Map quiz: handoff for local development

This repo only holds the **compiled** app (`assets/index-*.js` is minified). The original sources are not
in this repo or on any branch, so the map quiz was built as a separate, readable module and wired into the
bundle with a tiny patch. Finishing it locally means moving that module into the real source tree and
dropping the bundle patch.

## What is source and what is generated

| Path | What | Action in the source repo |
|---|---|---|
| `assets/pipboy-map.js` | The whole feature (UI, pan/zoom, quiz logic, texts). Plain ES module, no build needed. | Move to e.g. `src/features/map/`, convert to JSX/TS if you like |
| `assets/pipboy-map.css` | Styles (uses the app's CSS variables: `--fg`, `--warn`, `--bad`, `--font`…) | Merge into the app styles |
| `data/maps.json` | Markers, coordinates, targets, icon paths for FO3 / FNV / FO4 / FO76 (generated) | Copy to the app's static/public folder |
| `img/maps/*.webp`, `img/maps/icons/*.png` | Map images and marker glyphs (generated) | Copy to static/public |
| `tools/build_maps.py` | Regenerates the two rows above from the Fallout Wiki | Keep in repo (`python3 tools/build_maps.py`, needs `curl`, Pillow and `opencv-python-headless`) |
| `tools/sources/*.jpg` | In-game Pip-Boy maps with icons for FO3 and FNV (input of the build script) | Keep with the tool |
| `data/place-facts.json` | One curiosity (EN + IT) per place that has one: 105 places (generated) | Copy to static/public |
| `data/place-descriptions.json` | A description (EN + IT) per place: the opening of its wiki page, 337 places (generated) | Copy to static/public |
| `tools/build_descriptions.py` | Builds it: English from the wiki page, Italian from the Italian wiki page linked by the interlanguage link (125 places) or from `tools/sources/place-descriptions-it.json` (213 hand-written translations); openings that only say "X is a location in Y" are dropped | Keep in repo |
| `tools/build_facts.py` | Builds it from the wiki's "Behind the scenes" bullets (filtered) and `tools/sources/place-facts-it.json` (hand-written Italian translations) | Keep in repo |
| `data/creatures.json`, `img/creatures/*.webp` | 93 creatures (FO3 17, FNV 26, FO4 18, FO76 32) with transparent image and the wiki figures, body type, weak points (generated) | Copy to static/public |
| `tools/build_creatures.py` | Builds them from the wiki creature pages; `tools/sources/creature-weakpoints.json` and `creature-notes-it.json` are its hand-curated inputs | Keep in repo (needs Pillow) |
| `tools/test_combat.mjs`, `tools/smoke_combat.mjs` | Fight engine unit tests and full browser battles with scripted dice | Optional |
| `tools/smoke_map.mjs` | Playwright smoke test of the MAP tab | Optional |

## Integration in the original sources (4 changes)

The module exports `createMapTab({ React, useStore, useI18n, sound, Quiz })` and returns the `MapTab` component.
In the compiled bundle the arguments are `P` (React), `Ut` (store hook), `kn` (i18n hook, returns `{ lang, t }`),
`eo` (sound player: `"right"`, `"wrong"`, `"caps"`) and `Gc` (the app's quiz-session component, props
`{ title, questions, onExit, onFinish({correct,total,xp}) }`, used for the missions of the discovery mode).
In the sources use the real names. From the store the module uses `answer`, `completeSession`, `questions`
(already filtered by quiz language) and `progress.seen`.

1. **Tab.** Create the component once and add a `map` tab next to quiz/radio/data/stat (the real Pip-Boy order
   is STAT INV DATA MAP RADIO, here it sits between DATA and STAT):
   ```js
   const MapTab = createMapTab({ React, useStore, useI18n, sound: playSound, Quiz: QuizSession });
   // tabs: { key: "map", label: "MAP" }   ...   {tab === "map" && <MapTab />}
   ```
2. **Answer reducer** (the function that records an answer in the store; `Rp` in the bundle). Map questions
   are not in `questions-*.json` and have no article, so:
   - do not add them to `wrong` (review mode only knows real questions, and `toReview` would count them):
     `n || q.kind === "map" ? delete wrong[q.id] : wrong[q.id] = …`
   - only unlock an article when there is one: `n && q.articleId && !unlocked.includes(q.articleId)`
3. **CSS.** Import `pipboy-map.css`.
4. **Data.** Serve `data/maps.json` and `img/maps/` next to the other data (the module fetches `./data/maps.json`
   lazily the first time the MAP tab opens; images are lazy too).

`store.answer(q, ok, seconds)` is called with a pseudo question
`{ id: "map:<markerId>", kind: "map", tipo: "luogo", livello: 2, giochi: [game] }`, so XP, streak and the
Perception (S.P.E.C.I.A.L.) point work like any other quiz. `store.completeSession()` runs at the end.

### The patch applied to the compiled bundle (to discard once the sources are rebuilt)

`git diff 9f683ee -- assets/index-CvmPLGRf.js index.html` shows it. It is only:
- `import{createMapTab as __createMapTab}from"./pipboy-map.js";` at the top;
- `const MapTab=__createMapTab({React:P,useStore:Ut,useI18n:kn,sound:eo});` before `function fm(){…}`,
  plus the `{key:"map",label:"MAP"}` tab and `t==="map"&&c.jsx(MapTab,{})`;
- the two reducer tweaks above (`Rp`);
- `index.html` links `assets/pipboy-map.css`.

## Modes (MAP tab)

| Mode | What it does |
|---|---|
| Find the place | 10 rounds: tap the named place. Points by distance (100 within half the hit radius, then linear to 0 at 7.5x); counts as correct, for XP, within the hit radius. Best score per map is kept. |
| Which place is this? | A place is highlighted, pick its name among 4 (distractors: same category / nearby). |
| Discover the map | Fog of war. Starts at the game's first vault (`start` in `data/maps.json`, table `START` in the build script). The 4 nearest undiscovered places appear as empty green-circle markers (the wiki's `Icon FOx Map Circle`, redrawn as SVG); pick one and "travel": a 3-question mission built from the app's own questions for that game (unseen first). The questions get harder with the discovered share of the map (`missionLevel`: under 15% only level 1, under 50% levels 1-2, then 1-3; the `livello` of each question in the app data), unseen ones first. All 3 answers must be right (`MISSION_PASS`) to discover the place and lift the fog around it; otherwise try again. Progress is saved per map. |
| Explorer | Browse freely; tap an icon for name, type and wiki link; highlight a category. |
| Which icon is this? | A zoomed icon is circled, pick the kind of place (only generic categories, never a place's own name). Not offered for FO76 (its icons are pictures, not glyphs). |

Icons of places still to discover stay visible but in another colour (`Layers` / `reveal` in the module); the map image
itself is never altered:
- FO4: `img/maps/fo4-glyphs.webp`, a transparent layer holding only the baked glyph pixels in amber (`make_glyphs`, needs
  `opencv-python-headless`), drawn over the map and clipped to a square around each undiscovered marker.
- FO3 and FNV: the wiki coordinates are a few pixels off the icons drawn on the real maps, so the build script snaps every marker
  onto its icon plate (`snap_to_icons`: matched filter for a bright square of the plate size, `ICON_PLATE`). The recoloured box is
  then exactly the icon.
- FO3 (green -> amber) and FNV (amber -> cyan): the icons are filled plates, so a copy of the map with its hue rotated
  (`HUE_TINT` in the build script, `hue` in `data/maps.json`) is drawn clipped to a square around each marker.
- DLC maps: the glyph overlay switches to a recoloured set (`icons_undisc`).
- FO76: left as it is (fog only), on purpose.
Where the icons are recoloured the recoloured icon is itself the "to discover" marker: only the selected place gets the green ring. On FO76 (icons not recoloured) every place you can travel to has the green empty-circle marker. Discovered icons keep the map's own colour.
(An earlier approach that wiped the icons with inpainting was dropped: it smudged the maps.)

Categories that are a place's own name (Diamond City, Castle…) are never shown as a hint (`isGeneric`).

The description of a place (and its curiosity, when it has one) is shown on discovery, in the explorer and in the answer boxes (`Fact` component). Creature pictures keep their original colours.

Own persistence: discovered places and best scores live in `localStorage` key `wasteland-quiz-map-v1`, outside the app
store (the app's "reset progress" does not clear it). In the real sources move them into the store/progress object.

## The fight (discovery mode)

Travelling to a place has two steps: **fight, then quiz**. Rules live in the pure functions at the top of
`assets/pipboy-map.js` (`newFight`, `playerShot`, `creatureTurn`, `fleeInfo`, `pickCreature`), modelled on V.A.T.S.
(Fallout 3/4: per-part hit chance capped at 95%, action points per shot and a queue of shots, limbs with their own health
that cripple at zero, a critical meter fed by every shot and faster with Luck, criticals always hit).

**Creature data comes from the wiki, not from me** (`tools/build_creatures.py` -> `data/creatures.json`), per creature of
the game's "creatures" category:
- level, health, melee damage, damage resistance / threshold: the stats table of the wiki page (the row of the plain creature);
- body type (which V.A.T.S. zones it has): read from the page's Biology / Characteristics text and categories
  (quadruped, rodent, crustacean, insect, tentacles...), see `body_of`;
- weak points and resistances: shown as the wiki sentences (EN, with Italian translations in
  `tools/sources/creature-notes-it.json`), and encoded as damage multipliers in `tools/sources/creature-weakpoints.json`,
  each entry carrying the sentence it comes from (`because`). Encoded so far: mirelurk (shell on the body, small face),
  radscorpion (no weak point, legs resist), cazador (no head bonus), FO4 deathclaw (belly is the weak spot, scales resist),
  FO76 mirelurk hunter / queen / cave cricket. Crippled antennae (ants, mantises, cazador) are a zone: frenzy = it fights blindly.
- **Fallout 76 weak and tough spots are the game's own figures**: the wiki table "Body part multipliers" (page "Fallout 76 combat",
  taken from the game's body part data) is parsed by `fo76_spots` and overrides the hand-written entries (e.g. mirelurk: head x2,
  arms x0.5, shell x0.25; deathclaw: belly x2). Zone names map to roles (head/face -> head, belly/shell/body -> torso, arm/claw -> arms).
- **Other games, by analogy**: creatures that also exist in Fallout 76 (dog, deathclaw, mirelurk, ghoul, super mutant, mole rat, yao guai, radscorpion, bloatfly, stingwing, radstag, mongrel, mutant hound, brahmin, alien...) get the FO76 multipliers of their species, flagged `derived: weak` and announced in the intro ("estimated from Fallout 76"). Figures found for that very game on the wiki (`creature-weakpoints.json`: FO3 mirelurk and radscorpion, FNV radscorpion and cazador, FO4 deathclaw and mirelurk) override the analogy per zone. Creatures without a FO76 equivalent (ants, mantises, cazador, centaur, gecko, bighorner, cyberdog, spore carrier...) keep the generic model.
- **FO3, New Vegas and FO4**: no structured public source exists. The real data is the game's *Body Part Data* records
  (per creature: part names, V.A.T.S. hit chance, damage multiplier, cripple threshold), readable only from the game files with
  xEdit / the GECK / Creation Kit. If you can export them (xEdit "Export to JSON" / a BPTD script on `Fallout3.esm`, `FalloutNV.esm`,
  `Fallout4.esm`), a small script can replace `BODIES` and the multipliers with exact per-creature zones. YouTube footage was
  tried and is not available from the build environment (downloads need a signed-in account), so it was not used.
- Not in the wiki, so a fallback that is flagged `derived` in the data and shown with `*` in the UI: level for 8 creatures,
  health/damage of most FO76 creatures (the FO76 pages have no stats table: health `8 + 10 x level`, damage `2 + 1.5 x level`),
  speed (read from words like "fast" / "slow", else `SPEED_FALLBACK`), and the body type of 6 creatures (default humanoid).
  The script prints these lists when it runs. Ravens and night stalkers (not targetable in V.A.T.S. per the wiki) are left out.
- Armour: the wiki damage resistance becomes a share of the damage absorbed (`absorb_of`); critical hits ignore it.

1. A creature of the game appears with its figures and the weak points text. The more of the map is discovered
   (`1 + discovered/3`), the higher the level of the creatures that can show up (`pickCreature`).
2. **Fight** or **Flee**.
3. Flee is only enabled if you are faster than the creature (`3 + Agility` > its speed: slow 3, normal 5, fast 8, -2 per
   crippled leg/wing) or it is blind/frenzied. It succeeds with `60 + 10 x speed difference` %; a failed escape gives the
   creature a free turn. Fleeing ends the mission without discovering the place.
4. Fight: pick body parts (hit % and damage multiplier on each zone, limb health bar), queue shots (2 AP each,
   `6 + 2 x Agility` AP), optionally arm the **critical** when the meter is full, **Execute**. Shots resolve one by one, then the creature
   strikes back (twice if fast), then your AP refill.

| | Formula |
|---|---|
| Creature | health and damage from the wiki; dodges `1.5 x level`% (max 35, +6 if fast); armour absorbs `absorb` of your damage |
| You | health `40 + 8 End + 5 Lv`, damage `6 + 2 Lv + Str`, hit chance `part accuracy + 3 Per - dodge` (5-95%) |
| Zones | head acc 45 x2 (crippled: creature hit chance halves); torso 80 x1; arms/claws 55 x0.7 (crippled: creature damage -25% each); legs/wings 60 x0.8 (crippled: slower, easier to hit); antennae 35 x0.5 (crippled: frenzy). Wiki weak points replace the multiplier of a zone |
| Crit meter | `+14 + 3 Luck` per shot, 100 = full; the critical shot always hits, x2, ignores armour |

Weak creatures can die from one shot (the FO3 radroach has 5 HP), strong ones need several rounds, and a New Vegas
deathclaw (125 damage) kills a level-1 player in one strike: levels come from the real game, the rookie just meets
creatures of the right tier. Player stats come from the app (`stats.level`, `stats.special`: `ts(xp).level` and
`ns(progress, key)` in the bundle). Win -> quiz (3 of 3 correct), lose or flee -> back to the map.

Look of the aiming screen (as in the games' V.A.T.S.): the scene dims, the targeted body part glows green along the creature's own
silhouette (a copy of the picture masked to the part's rectangle with feathered edges, `featherMask`: the transparent background
keeps only the creature's pixels), and the parts are listed as labels on the two sides with leader lines (`layoutLabels`). Tap a
label or the body part to aim and queue a shot. Entering V.A.T.S. plays a zoom-in and a scan line.

Zone rectangles: the body template (`BODIES`) gives the layout, then `fit_zones` in `tools/build_creatures.py` shrinks every
rectangle to the creature's own silhouette (opaque pixels of its picture) and mirrors four-legged beasts that face right; the result
is stored per creature in `data/creatures.json` (`zones`). Where the automatic choice looks wrong, `tools/sources/creature-zones.json`
sets the template (`body`) or the facing (`mirror`) by page title, after looking at the picture. They are still approximations: the
real positions are in the game's body part data (see above).

Creatures with no known weak points (no wiki figure for their game, no Fallout 76 analogue) are flagged `pending` in `data/creatures.json`
and never appear in the fights; the list is written to `tools/sources/creatures-without-weakpoints.txt`. Add their weak points to
`tools/sources/creature-weakpoints.json` and rebuild, and they appear.
Test hook (used by the smoke tests): `window.__PM = { rng, creature, level, fast, invincible }`; not set in production.

## How the quiz works

- `data/maps.json` → `{ <mapKey>: { label, group, short, image, hit, bbox, icons, cats, markers, targets } }`.
  Map keys: `fo3`, `fo3pl` (Point Lookout), `fo3tp` (The Pitt), `fo3oa` (Operation Anchorage), `fnv`, `fnvhh` (Honest Hearts),
  `fnvlr` (Lonesome Road), `fnvowb` (Old World Blues), `fo4`, `fo76`. `group` is the game (the first row of chips),
  `short` the name in the second row of chips (shown when a game has more than one map). Broken Steel and Dead Money
  are left out (5 and 7 markers); add them in `GAMES` in `tools/build_maps.py` if wanted.
  Coordinates are 0–1000 on a square map. `targets` are the marker ids that can be asked
  (notable locations, see `tools/build_maps.py`: major categories, markers alone in their category,
  markers that have an entry in `data/articles.json`; the DLC maps ask every marker; FO3/FNV locations that the wiki's
  "Fallout 3 locations" / "Fallout: New Vegas locations" lists show in italic, i.e. not marked on the Pip-Boy, are never asked). `hit` is the tap tolerance in map units.
- Find mode: 10 random targets per session; a tap within `hit` of the target is correct. Tapping another marker
  names it in the feedback.
- FO4, FO76 and the two main maps of FO3 and New Vegas are the real in-game maps with their icons already drawn in:
  nothing is overlaid. FO3 and FNV use the screenshots in `tools/sources/` (provided by the project owner; FNV is the
  amber original, FO3 is 580x569 so it is upscaled to a square 1160 px and is the softest map). The wiki marker
  coordinates are re-aligned onto them with `BAKED[...]["align"]` in `tools/build_maps.py` (fitted by matching the
  markers to the visible icons: FNV is a ~6 px vertical shift, FO3 a small shift plus 1.6% vertical scale). Targets
  are only markers that show an icon (`min_lum`). A sharper FO3 map would improve it: drop it in `tools/sources/`.
- The DLC maps (Point Lookout, The Pitt, Anchorage, Honest Hearts, Lonesome Road, Old World Blues) only exist as
  wiki base images without icons: they are tinted (green for FO3, amber for FNV) and the markers are drawn with
  **Fallout 4 icons**, cropped by the build script from the FO4 map (one glyph per category, mapping in
  `FO4_ICON_FOR`, `-amber` variants for New Vegas).
- FO76 is the original paper map resized to 2560 px.

## Run and test locally

```sh
python3 -m http.server 8000          # then open http://localhost:8000 and the MAP tab
node tools/smoke_map.mjs http://localhost:8000   # needs: npm i playwright
python3 tools/build_maps.py          # regenerate data + images (cache in .map-cache/, git-ignored)
```

## Ideas / things left to do

- Move the module's texts (`TEXT`, `CAT_IT`) into the app's i18n files; the tab label is hard-coded `"MAP"`.
- Tune the target list per game (`MAJOR`, `SKIP_CATS` in `tools/build_maps.py`) and the hit radius; add difficulty.
- Descriptions for the places (the wiki markers only carry a name, a category and a page link).
- More maps: Fallout 1/2 world maps, Nuka-World / Far Harbor, Broken Steel / Dead Money (the wiki has interactive maps for them too).
- DLC maps: better with real in-game maps with baked icons, if you have them (add to `tools/sources/` and `BAKED`).
  The wiki location lists contain neither icons nor coordinates (fallout.wiki blocks scripted downloads).
- The FO76 map shows the Mappalachia watermark at the bottom of the image (credited in README).
- The zoom buttons sit over the top-right corner of the map; a target there needs a pan first.
- Discovery: daily "luogo del giorno", a unified map-progress screen, a bonus for completing a map, reveal radius per map
  (`radius` in `Discover`, now 105 / 130 for DLC), mission length (`MISSION_QUESTIONS`, `MISSION_PASS`, now 3 of 3).
- Add an automatic test for the discovery progress persistence (`tools/smoke_map.mjs` covers the happy path).

## Credits and licence

Marker names, coordinates and map images come from the Fallout Wiki interactive maps (CC BY-SA 3.0); game
images belong to their owners; the FO76 map image is credited to Mappalachia. See README.
