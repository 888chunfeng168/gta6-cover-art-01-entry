# Boulevard Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/888chunfeng168/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/888chunfeng168/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your photos and a caption into GTA-style multi-panel cover art, exported as a PNG to share. Built for the [gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01) on make.fun.

## What it does

- **Any photo** — upload photos from your machine (or try the bundled samples), crop and position each one by dragging on the cover, zoom with the slider or mouse wheel.
- **Multi-panel posters** — four layouts (Four Corners, Hero Left, Top Story, Street Strip), each filling several panels with one photo or several.
- **Sunset / neon grades** — four colour grades (Vice Sunset, Neon Nights, Golden Hour, Palm Noir) with bold Anton lettering and a Pacifico script subtitle.
- **Fast** — a few steps from photo to PNG: pick photos, pick a layout and grade, type the caption, export in 1080×1080, 1080×1350 or 1920×1080.
- **Offline** — plain static files under `app/`, no build step, no network request at runtime. Photos never leave your machine.

## Layouts & grades

| Layout | Panels |
| --- | --- |
| Four Corners | 2 × 2 grid |
| Hero Left | one big hero + three stacked |
| Top Story | one wide hero + three below |
| Street Strip | full-bleed photo + three snapshots |

| Grade | Look |
| --- | --- |
| Vice Sunset | warm orange–pink sunset wash |
| Neon Nights | magenta–cyan night glow |
| Golden Hour | sepia gold, late light |
| Palm Noir | cool teal–pink, high contrast |

## Screenshots

The `screenshots/` folder shows the app with photos loaded and covers it exported in all three post sizes (wide, portrait, square).

## Files

- `app/` — the static app: `index.html`, `style.css`, `src/cover.js` (the render engine), `src/main.js` (the editor), `src/shots.js` (screenshot scenes), `fonts/` (Anton + Pacifico, OFL), `samples/` (AI-generated sample photos)
- `screenshots/` — the entry's screenshots: the app with photos loaded and covers it exported
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged
- `main.ts` — the entry program that hands the app in

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `vendor/makefun-app.ts` library.

## Credits

- Lettering uses **Anton** and **Pacifico** under the SIL Open Font License — see `app/fonts/OFL.txt`.
- Sample photos are AI-generated for this entry.
- Original work: no Rockstar Games logo, artwork or font is used.
