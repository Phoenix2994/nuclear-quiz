# nuclear-quiz

Unofficial fan-made quiz app. Not affiliated with, endorsed by or sponsored by Bethesda Softworks, ZeniMax Media or Microsoft. Fallout and related trademarks belong to their respective owners.

Entry texts come from the Fallout Wiki (https://fallout.fandom.com) and are available under CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/). Questions were adapted from those texts and are released under the same license. Images belong to their respective owners and are shown from the wiki.

This repository only contains the compiled static app.

## Map quiz (MAP tab)

The map quiz uses the interactive maps of the Fallout Wiki (https://fallout.fandom.com, CC BY-SA 3.0) for Fallout 3, Fallout: New Vegas, Fallout 4 and Fallout 76: marker names and coordinates are in `data/maps.json`, the map images and marker icons in `img/maps/`. The Fallout 3 and New Vegas maps are tinted green and use the game's own marker glyphs. The Fallout 76 map image is credited to Mappalachia (https://github.com/AHeroicLlama/Mappalachia). All game images belong to their respective owners.

`tools/build_maps.py` regenerates the data and images from the wiki; `assets/pipboy-map.js` and `assets/pipboy-map.css` hold the map quiz code, wired into the compiled bundle.
