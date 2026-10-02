# Instructions

[← README](../README.md) · [File structure](FILE-STRUCTURE.md)

## What it does

Birdseye FC replays iconic football moments as stylised animations: every player runs, turns,
lunges and dives on a scale pitch, with original commentary read aloud over the top. Twenty-five
clips ship with it, from Carlos Alberto in 1970 to the Lusail final, plus two coaching moves.
Eleven are built from StatsBomb's own match data rather than from memory.

- **Drawn from straight above.** Every player is a body seen from overhead — shoulders, head, arms
  swinging, legs striding — in ink over the kit colour, on a scale pitch.
- **Real movement.** Players hold shape, mark, press, jockey and tackle; defenders track the ball
  and lunge for it rather than drifting. Speeds stay inside human limits.
- **Spoken commentary.** Written for this project — never the broadcast audio — read aloud by the
  best voice the browser offers.
- **Crowd sound.** A real stadium recording underneath: a murmur that lifts with the play and a roar
  at the goal, mixed live and into downloaded videos.
- **An orchestral score, if you want one.** Holst's Mars under the play, lifting as the ball nears
  goal and swelling when one goes in. Off by default; it goes into downloaded videos too.
- **The passes that were on.** At any moment the ball is at someone's feet, draw a line to every
  team-mate it could have reached without an opponent close enough to cut it out — and separate the
  ones the player could see from the ones behind their shoulders. The pass they played is solid; an
  option they had and could not see is marked. It is worked out from reconstructed positions, so it
  shows the shape of a decision rather than a record of one.
- **Movement heatmap.** Shade the pitch by where the players spent the clip — everyone, one team,
  or just the player the clip is about. It goes into downloaded videos too.
- **Ball physics.** A struck ball slows as it travels, swerves with the spin on it and rolls as it
  goes. The live reading under the pitch shows how fast it is moving and whether it is curling.
- **Period detail.** Kits, ball colour and stadium change with the year and the venue: floodlights,
  athletics track, roof, mowing pattern, crowd colours.
- **Live play-by-play.** A timestamped feed that fills in as the clip runs, with goals, saves, tackles
  and special skills badged and marked on the timeline. Click any line to jump to that moment.
- **Analysis.** A short written breakdown under each clip: context, the move itself, why it worked.
- **Things to learn from this play.** Three or four coaching points per clip — what to copy and why it works.
- **Video download.** Export any clip as an MP4 in four aspect ratios (16:9, 9:16, 1:1, 4:5).
- **Real footage side by side.** Where the rights holder allows embedding, the original clip plays
  next to the animation, scrubbed in sync. Any YouTube link can be added by hand.
- **Installs and works offline.** Web app manifest plus a service worker, so it can be added to a
  phone home screen or a dock and still run with no network.

## Running it locally

```bash
python3 -m http.server 8777 --directory docs
```

Then open http://localhost:8777. No build step, no dependencies — it is plain HTML, CSS and
JavaScript, and nothing but the fonts comes from a CDN.

## Adding a clip

1. Write `library/plays/<year>-<name>.json` — copy an existing one for the shape. For a match
   StatsBomb have published, start from the real data instead:
   ```bash
   python3 tools/import_statsbomb.py --match 3750191 --goal 2 --check
   ```
   That writes a draft into `library/imported/` with the ball's real path, the order of events and
   every player the data places. Write the title, captions, commentary, analysis, lessons, kit
   colours, venue and score over the TODO placeholders, then move it into `library/plays/`.
2. Check it: `node tools/check_plays.js library/plays/*.json`, then the movement checks —
   `check_motion.js` (facing and stride), `check_glide.js` (speed and acceleration limits),
   `check_ball.js` (the ball against bodies) and `check_press.js` (defenders closing the ball).
3. Bundle and rebuild: `python3 tools/build_library.py && python3 build_site.py`
4. Commit `docs/` along with the source; pushing to `main` publishes the site.

The checkers reject anything physically implausible — a 40 m/s pass, a 12 m/s sprint, a body
changing pace faster than legs can push, a ball travelling through someone, players standing
inside each other — along with any goal whose ball misses the net, and any wording that uses
he/she instead of a name or a role.

## Accuracy and rights

Every clip is a reconstruction from match reports and memory: positions, kits and player
appearances are approximate, not tracking data. Commentary is written for this project and
is never a transcript of the original broadcast. No broadcast footage is copied or hosted —
real clips appear only as YouTube embeds, from the rights holders' own channels. The crowd
recording is "Football game recorded on the neutral section inside the crowd" by Work With Sounds /
Torsten Nilsson, [CC BY 4.0](https://commons.wikimedia.org/wiki/File:WWS_FootballAustriavs.Sweden.ogg).
The score is Holst's Mars, played by the United States Air Force Band, public domain.

Not affiliated with any club, league or broadcaster. Player names appear as factual reference
to public sporting events.
