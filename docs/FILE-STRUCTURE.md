# File structure

[← README](../README.md) · [Instructions](INSTRUCTIONS.md) · [System design](SYSTEM-DESIGN.md)

| Path | What it is |
| --- | --- |
| `birdseye.html` | The whole app in one file: pitch model, motion engine, rendering, UI, voice, video export |
| `library/plays/*.json` | One file per clip: players, paths, ball, actions, commentary, venue, analysis |
| `library/clips.js` | The bundled library the app loads, built from `library/plays/` |
| `sound/crowd.js` | Crowd bed and goal reaction, mixed live and into downloaded video |
| `sound/score.js` | The optional orchestral score, its level following the play |
| `sound/recordings.js` | The crowd and score audio itself, embedded so the page needs no network |
| `docs/` | The built website — this is what GitHub Pages serves |
| `docs/SYSTEM-DESIGN.md` | How the app is put together: components, flows, data, design decisions |
| `tools/check_plays.js` | Validator: timing, speeds, spacing, kits, wording, goal geometry |
| `tools/check_motion.js` | Checks how bodies move: facing vs direction of travel, turn rate, run cycle |
| `tools/check_glide.js` | Holds every body to a human top speed and a human change of pace |
| `tools/check_ball.js` | Checks the ball never travels through a player who is not playing it |
| `tools/check_press.js` | Checks the defender nearest the ball closes it down rather than backing off |
| `tools/quicken_chases.py` | Finds defenders loitering behind the play and re-times their route into a chase |
| `tools/shot.js` | Screenshots the running app with headless Chrome, for checking what it draws |
| `tools/build_library.py` | Bundles `library/plays/*.json` into `library/clips.js` |
| `tools/import_statsbomb.py` | Builds a play file from StatsBomb open data: the real ball path and player positions |
| `library/imported/` | Drafts from the importer, before the words are written |
| `build_site.py` | Builds `docs/` from `birdseye.html` (icons, manifest, service worker) |
| `build_sounds.py` | Embeds the crowd and score recordings from `sound/recordings/` into the page |
| `soccer_viz.md` | The spec this was built from, with a changelog |
