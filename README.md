# nuclear-quiz

Unofficial fan-made quiz app. Not affiliated with, endorsed by or sponsored by Bethesda Softworks, ZeniMax Media or Microsoft. Fallout and related trademarks belong to their respective owners.

Entry texts come from the Fallout Wiki (https://fallout.fandom.com) and are available under CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/). Questions were adapted from those texts and are released under the same license. Images belong to their respective owners and are shown from the wiki.

This repository only contains the compiled static app.

## Map quiz (MAP tab)

Four modes (in the discovery mode each place also needs a V.A.T.S.-style fight against a creature): find the place (scored by distance), which place is this, discover the map (fog of war lifted by quiz missions, starting at the first vault) and explorer. The map icons are also asked in the normal quizzes ("what kind of place does this icon mark?", `tools/build_icon_questions.py`).

The map quiz uses the interactive maps of the Fallout Wiki (https://fallout.fandom.com, CC BY-SA 3.0) for Fallout 3 (plus Point Lookout, The Pitt, Operation Anchorage), Fallout: New Vegas (plus Honest Hearts, Lonesome Road, Old World Blues), Fallout 4 and Fallout 76: marker names and coordinates are in `data/maps.json`, the map images and marker icons in `img/maps/`. The Fallout 3, New Vegas and Fallout 4 maps are the in-game Pip-Boy maps with their icons; the DLC maps are tinted and use Fallout 4 marker icons (cropped from the Fallout 4 map). The weapon pictures of the discovery mode (`img/weapons/`) come from the Fallout Wiki too. The Fallout 76 map image is credited to Mappalachia (https://github.com/AHeroicLlama/Mappalachia). All game images belong to their respective owners.

See `HANDOFF.md` to continue the work on the real sources. `tools/build_maps.py` regenerates the data and images from the wiki; `assets/pipboy-map.js` and `assets/pipboy-map.css` hold the map quiz code, wired into the compiled bundle.
