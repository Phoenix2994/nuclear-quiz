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
| `tools/build_maps.py` | Regenerates the two rows above from the Fallout Wiki | Keep in repo (`python3 tools/build_maps.py`, needs `curl` and Pillow) |
| `tools/smoke_map.mjs` | Playwright smoke test of the MAP tab | Optional |

## Integration in the original sources (4 changes)

The module exports `createMapTab({ React, useStore, useI18n, sound })` and returns the `MapTab` component.
In the compiled bundle the arguments are `P` (React), `Ut` (store hook), `kn` (i18n hook, returns `{ lang, t }`)
and `eo` (sound player: `"right"`, `"wrong"`…). In the sources use the real names.

1. **Tab.** Create the component once and add a `map` tab next to quiz/radio/data/stat (the real Pip-Boy order
   is STAT INV DATA MAP RADIO, here it sits between DATA and STAT):
   ```js
   const MapTab = createMapTab({ React, useStore, useI18n, sound: playSound });
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
- 10 random targets per session; a tap within `hit` of the target is correct. Tapping another marker
  names it in the feedback.
- FO4 and FO76 images already contain their icons. FO3 and New Vegas images have none: the markers are drawn
  with the **Fallout 4 icons**, cropped by the build script from the FO4 map (one clean glyph per category,
  mapping in `FO4_ICON_FOR`).
- FO3/FNV maps are duotone-tinted green by the build script; FO4 is the original Pip-Boy map; FO76 is the
  original paper map resized to 2560 px.

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
- FO3/FNV icons: the wiki's own recreation of the original markers ("Icon … gamebryo") are still the alternative to the
  FO4 glyphs; the wiki location lists contain neither icons nor coordinates (fallout.wiki blocks scripted downloads).
- The FO76 map shows the Mappalachia watermark at the bottom of the image (credited in README).
- The zoom buttons sit over the top-right corner of the map; a target there needs a pan first.

## Credits and licence

Marker names, coordinates and map images come from the Fallout Wiki interactive maps (CC BY-SA 3.0); game
images belong to their owners; the FO76 map image is credited to Mappalachia. See README.
