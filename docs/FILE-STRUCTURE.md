# File structure

[← README](../README.md) · [Instructions](INSTRUCTIONS.md)

| Path | What it is |
| --- | --- |
| `birdseye.html` | The whole app in one file: pitch model, motion engine, rendering, UI, voice, video export |
| `looks/` | The Broadcast, Arcade and 3D renderers (Classic lives in `birdseye.html`) |
| `library/plays/*.json` | One file per clip: players, paths, ball, actions, commentary, venue, analysis |
| `library/clips.js` | The bundled library the app loads, built from `library/plays/` |
| `sound/crowd.js` | Crowd bed and goal reaction, mixed live and into downloaded video |
| `sound/recordings.js` | The crowd audio itself, embedded so the page needs no network |
| `docs/` | The built website — this is what GitHub Pages serves |
| `tools/check_plays.js` | Validator: timing, speeds, spacing, kits, wording, goal geometry |
| `tools/check_motion.js` | Checks how bodies move: facing vs direction of travel, turn rate, run cycle |
| `tools/quicken_chases.py` | Finds defenders loitering behind the play and re-times their route into a chase |
| `tools/build_library.py` | Bundles `library/plays/*.json` into `library/clips.js` |
| `tools/import_statsbomb.py` | Builds a play file from StatsBomb open data: the real ball path and player positions |
| `library/imported/` | Drafts from the importer, before the words are written |
| `build_site.py` | Builds `docs/` from `birdseye.html` (icons, manifest, service worker) |
| `build_sounds.py` | Embeds the crowd recordings from `sound/recordings/` into the page |
| `soccer_viz.md` | The spec this was built from, with a changelog |
