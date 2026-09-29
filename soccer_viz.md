PROJECT NAME: soccer_viz

META-INSTRUCTIONS:

<Read everything below before acting. If anything is unclear, contradictory,
 or underspecified, ask before starting — batch your questions into one message.>

<If you see a way to make the instructions simpler or more effective, propose
 the change first. Only edit this file after I approve. Keep a short changelog
 at the bottom.>

<Do not expand scope. If something seems necessary but isn't listed, flag it
 as a proposal — don't just do it.>

<Prefer doing over describing. Run code, produce files, test things.>

<At the end of the build, list every deliverable component with its path and a
 one-line description of what it is and how to verify it works.>

<If the build is a built-out application (not a script or one-off file),
 include a small, unobtrusive feedback tab where users can leave feedback on
 the product. Keep it minimal. It's always in scope, so no proposal needed.>

CONTEXT:

<What this is for, who consumes the output, and any background the agent
 needs that it couldn't infer. One paragraph max.>

 cute <30s animations that explain either a certain move .. or a certain clip (i.e. user can paste youtuve clip and it translates to the overhead soccer vizualization). simple, but beautiful. 

 example can be "messi goal against real madrid 2011 semi-finals cl" and it shows an overhead visualization.

 more complex visualizations in the future.

INPUTS:

- This file (soccer_viz.md) is the only input and is authoritative.
- A user's play request at runtime: free text (e.g. "messi goal against real
  madrid 2011 semi-finals cl") or the name of a move ("give-and-go").

INSTRUCTIONS:

1. Define a play JSON format: 105 × 68 m pitch, team A always attacks
   left → right, player paths as [t, x, y] keyframes, ball keyframes either
   at a player's feet ("with": id) or at a free point, plus timed captions,
   events (pass / shot / goal), commentary lines and a scoreline.
2. Build a single-page web app that draws an overhead pitch and animates any
   valid play under 30 s, with play/pause, scrubber, speed and restart controls.
3. Hand-author a starter library in that format: 1 clip (Messi's solo goal,
   Real Madrid 0–2 Barcelona, CL semi-final 1st leg, 27 Apr 2011) and
   2 moves (give-and-go, overlapping run). Then grow it to 17 iconic clips
   (1970–2018), one JSON file per play in library/plays/, bundled into
   library/clips.js; every play must pass the play checker (page validator
   plus speed, goal and spacing checks).
4. Add "Animate a play": send the user's text to Claude (the artifact's
   `sample` capability) with the format spec, then validate and normalize the
   returned JSON and animate it. If only a link is pasted, ask for a
   one-line description instead.
5. Add the small feedback tab, storing entries in the artifact's `db`.
6. Add "Download video": render the current play (title, scoreline, pitch,
   captions, note) to an MP4 in a chosen format: Landscape 16:9 (1920×1080),
   Square 1:1 (1080×1080), Portrait 4:5 (1080×1350) or Vertical 9:16
   (1080×1920, pitch turned so play runs upward, text kept clear of app
   overlays). Save it via the artifact's `downloads` capability (viewer
   confirms). Fall back to a real-time recording (MP4 or WebM) where the
   browser can't encode MP4 directly.
7. Add a Look switch (Classic / Broadcast / Arcade / 3D) that re-renders the
   same play, live and in every video format, with a procedural stadium crowd
   (also mixed into videos; the commentary voice isn't). Broadcast: TV camera
   in the stands tracking the ball. Arcade: game-style top-down with a
   following camera. 3D: Three.js stadium with shadowed players and an
   orbiting camera that swoops behind the goal. Epic looks slow each goal to
   0.35×. Broadcast and 3D add goal graphics; Arcade shows a live-style
   commentary strip instead, written originally (never quoted from real
   broadcasts). Each look is its own file so it can be removed.
8. Publish as a private Artifact and list the deliverables.

CONSTRAINTS:

- Stack: one HTML page plus one script per epic look in looks/, vanilla JS +
  Canvas 2D, no build step. Libraries: mp4-muxer 5.1.3 (jsDelivr) to package
  video downloads; Three.js r128 (cdnjs), loaded only when the 3D look is
  picked. Google Fonts only for type.
- Runs as a claude.ai Artifact. AI generation uses the viewer's own Claude
  account via `sample` — no API keys anywhere.
- Must NOT try to fetch or analyse video; there is no computer vision in v1.
- Every animation ≤ 30 s. Simple, beautiful, readable at phone width, light and
  dark themes, respects reduced motion.
- Reconstructions of real plays are approximate and must say so on screen.

DELIVERABLES:

- birdseye.html — the Birdseye FC app (pitch renderer, library, AI
  generation, video download, look switch, feedback tab)
- looks/broadcast.js — Broadcast look (TV camera angle)
- looks/arcade.js — Arcade look (game-style top-down)
- looks/stadium3d.js — 3D look (Three.js stadium)
- sound/crowd.js — procedural stadium crowd sound (live and in videos)
- library/plays/*.json — one iconic clip per file (source)
- library/clips.js — the clips bundled for the page
- build_site.py — builds the standalone website into docs/
- build_sounds.py — turns the crowd recordings in sound/recordings/ into sound/recordings.js
- tools/check_plays.js — checks play files (page validator + realism checks)
- tools/build_library.py — bundles library/plays/*.json into library/clips.js
- tools/import_statsbomb.py — builds a play file from StatsBomb open data (real ball path)
- docs/ — the built website / installable app (GitHub Pages serves this folder)
- README.md + screenshots/ — repository front page with screenshots of the UI
- https://amalmehta.github.io/soccer_viz/ — the live site
- https://github.com/amalmehta/soccer_viz — public repository
- Published Artifact URL — private link to the same page
- soccer_viz.md — this spec, filled in

DONE CRITERIA:

- birdseye.html opens in a browser and the Messi 2011 clip plays start to
  finish with no console errors.
- All 3 library plays load and play; scrubber and speed controls change playback.
- Every library play is ≤ 30 s and passes the same validator used for AI output.
- Page is usable at 400 px wide (no horizontal page scroll).
- Artifact publishes. In the live Artifact, typing a request and pressing
  Animate produces a play, or a clear error message.
- Feedback tab submits an entry that shows up via read_db.
- "Download video" on the live Artifact saves a video of the current play
  in each of the four formats, at the stated size, that opens and plays in
  QuickTime or VLC.

OPEN QUESTIONS / ASSUMPTIONS:

- YouTube links: the published page can't open links and Claude can't watch
  video, so a pasted link alone isn't enough; the user adds a one-line
  description. Real video → tracking is a future project.
- AI plays come from Claude's knowledge of the match, not the footage; they
  may be wrong in detail. Each play carries an "approximate" note.
- Messi 2011 clip is reconstructed from memory of match reports; only key
  players are named, positions are approximate.
- Generation spends the viewer's Claude usage (they're asked to allow it once).
- Declaring `db` (for feedback) makes the Artifact organization-internal, not
  publicly shareable. Feedback is not hidden from other viewers at the data level.
- Generated plays are kept only for the current page session (not saved).
  Saving them would be a separate proposal.

CHANGELOG:

- <date> — created
- 2026-09-15 — added meta-instruction: built-out applications include a small feedback tab
- 2026-09-15 — filled in INPUTS, INSTRUCTIONS, CONSTRAINTS, DELIVERABLES, DONE CRITERIA,
  OPEN QUESTIONS from Q&A: AI-from-text input, single-page Artifact, v1 = 1 clip + 2 moves
- 2026-09-15 — added "Download video" in the app (user request): 1080p MP4 via WebCodecs +
  mp4-muxer, real-time recording fallback; `downloads` capability
- 2026-09-15 — added video formats for social posting (user request): 16:9, 1:1, 4:5, 9:16
- 2026-09-15 — added Look switch with three epic looks (user request: "try all 3"):
  Broadcast, Arcade, 3D; on-page switch, no sound; goal slow motion in epic looks
- 2026-09-15 — Arcade: removed GOAL! title, confetti, flash, shake and SLOW-MO tag; added a
  typed-on commentary strip. Plays gain a "commentary" field (original writing, since real
  broadcast commentary is copyrighted); AI prompt asks for it
- 2026-09-15 — Arcade reads its commentary aloud during live playback (browser speech
  synthesis, Voice on/off button, user request). Downloaded videos stay silent: browser
  speech can't be recorded into a file
- 2026-09-15 — voice quality (user: built-in voice "so bad"; chose better built-in voices over a
  paid neural service): rank Premium > Natural > Enhanced > Google > standard, hide novelty
  voices, voice menu, tip on installing a Premium voice when only standard ones exist
- 2026-09-15 — realistic players in all three epic looks (user request): kit data per team
  (pattern, shorts, socks, goalkeeper colour) and "gk" per player, also asked of the AI; a shared
  stride-based gait (phase from distance run, so feet don't slide; sprint lengthens the stride;
  dribble touches). Arcade: top-down kit sprites; Broadcast: articulated side-on runners;
  3D: jointed players with kit textures and shirt numbers
- 2026-09-15 — stadium sound (user request): procedural Web Audio crowd in the epic looks (murmur,
  tension near goal, gasp at shots, goal roar), ducks under the commentary voice, Crowd on/off
  button; rendered offline and added to MP4 downloads as AAC where the browser can encode it.
  Voice stays browser speech (can't be processed or recorded)
- 2026-09-16 — livelier commentary voice (user request): lines split into phrases at pauses; each
  phrase's rate/pitch/volume follows the crowd's mood, "!" phrases faster and higher, "…" phrases
  held, capitals read as words, later phrases lift; lighter settings for Premium/Natural voices
- 2026-09-16 — player looks (user request: "each character should look like their actual
  player"): optional "look" per player (skin tone, hairstyle, hair colour, stubble/beard, height),
  stylised, from memory and marked approximate on screen; set for the named Messi-clip players,
  varied defaults for everyone else, asked of the AI for named players only. Drawn in all three
  epic looks (hair from above in Arcade, profile + beard in Broadcast, hair/beard meshes in 3D)
- 2026-09-16 — library grown to 17 iconic clips (user request "15-20"): 16 new plays 1970–2018
  written in parallel, each in library/plays/*.json, all passing a play checker (page validator
  + speeds, goal placement, spacing); bundled to library/clips.js. Library sorted by year, entries
  show teams and year. Reconstructions from memory, each with an accuracy note
- 2026-09-16 — five user requests:
  1. venue per play (time of day, roof, stand colours, athletics track, grass, mowing) drawn in
     Broadcast, Arcade and 3D (sky/roof, sun vs floodlights, shadows, track, stands);
  2. "analysis" per play: 3–4 labelled paragraphs shown under the play, also asked of the AI;
  3. ball design by era (leather → panels → triads → modern designs), in every look and 3D;
  4. kit cut by era (collars and short shorts in the 70s/80s, baggy 90s, slimmer later) and boot
     colours (black → bright after ~2008), in the three epic looks;
  5. commentary above the crowd: quieter crowd bed while the voice is on, faster/deeper ducking
     during each line, voice at full volume.
  Also: text refers to players by name or role instead of he/she; notes may run to 400 characters
- 2026-09-16 — standalone website + installable app (user request "launch in a website/app"):
  build_site.py writes site/ (index.html with proper head, manifest, icons, offline service
  worker, copies of looks/sound/library). Outside Claude, AI plays and feedback are hidden (user
  choice); library, looks, sound, voice and video downloads work. Deploy: drag site/ onto Netlify Drop
- 2026-09-16 — realistic player movement (user request): shared body model (R.bodyAt) with actions:
  automatic kicks (back-swing/strike/follow-through), defender lunges, keeper dives, goal
  celebrations and dejected defenders; plays can add special moments in "actions" (volley,
  bicycle, header, divingHeader, chest, slide, dive, jump), added to the 16 clips where they
  happened. Broadcast, Arcade and 3D all pose from the same joint angles.
- 2026-09-16 — crowd sound rebuilt (user: "grating", "static"): simulated voices with vowel
  formants and chatter bursts, scattered and rhythmic claps, whistles, "ooh" at shots and a
  rising roar at goals; the filtered-noise layers are gone
- 2026-09-16 — real footage beside the animation (user request; user chose "paste your own links"):
  website only. The viewer pastes a YouTube link (+ optional start time) per clip; it is embedded
  from YouTube (never copied or bundled), muted, shown side by side at equal height, remembered
  on the device, and kept roughly in step (play/pause/scrub/speed; drift correction outside
  slow motion). Not included in video downloads. Claude page unchanged (can't embed YouTube)
- 2026-09-16 — removed remaining goal gimmicks (user request): "GOAL"/"GOAL!" text, broadcast goal
  banner, confetti, white flashes, SLOW-MO tags, crowd camera flashes and pulsing floodlights,
  in Classic, Broadcast and 3D. Player celebrations and net ripple stay
- 2026-09-17 — match pace (user request): slow motion removed everywhere; supporting players get
  off-ball movement (team shape follows the ball with a reaction delay, constant jogging, room
  around dribblers and other players, capped at sprint speed). Supporters now average 2–4 m/s
  instead of ~1 m/s. Named players and anyone on the ball keep their choreographed paths.
- 2026-09-17 — crowd sound switched to real public-domain recordings (user choice, synthetic crowd
  sounded like the ocean): crowd.js plays a stadium ambience loop plus a goal reaction; the user
  downloads the two Freesound files into sound/recordings/, build_sounds.py embeds them. No
  recordings = no crowd (button hidden). Play checker and library bundler moved into tools/
- 2026-09-17 — official footage pre-filled (user choice): searched official channels and verified
  each clip actually plays when embedded. 5 do (Giggs/FA Cup, Bergkamp/Premier League, Zidane/Real
  Madrid, Agüero/Man City, Ibrahimović/England) and ship as "footage" in their play files. FIFA and
  UEFA clips refuse to play on other websites (YouTube error 150), so those plays have none; a
  blocked link now shows a "Watch it on YouTube" note instead of an error box. Van Basten, Roberto
  Carlos and Ronaldinho had no official embeddable upload; Messi's only one is a full match.
- 2026-09-17 — website builds now bust caches (versioned script URLs, fresh files on install) so a
  new build never shows stale data
- 2026-09-17 — defending (user: "defenders look clueless"): defenders and keepers face the ball
  (turning only to sprint back); off-ball defenders hold a zone that slides with the ball, stay
  goal-side of the nearest attacker, track back when caught upfield, and the defender nearest the
  ball carrier presses (which triggers the automatic lunge). Keepers sit on the ball–goal line.
  Measured: defenders face the ball 78–98% of the time; goal-side of nearby attackers 64–94%
- 2026-09-17 — defenders no longer run from the ball (user: "still doing random shit"): measured
  that rule-driven defenders ran away 22% of the time before goals vs 2% for choreographed ones.
  Fix: zones anchor to the starting spot (no drifting along scribbled routes), no hard goal-side
  push, and while the ball is in front of them defenders give ground only at a jockeying backpedal
  (≤2.2 m/s, facing the ball); they may close right in on the dribbler. Now 1.9%, facing the ball
  96%. Note: plays are reconstructions, not traced from footage (footage can't be analysed)
- 2026-09-18 — published (user: "lets add this to the site ... in the github make sure to add a
  screenshot of the ui"): public repo github.com/amalmehta/soccer_viz, live on GitHub Pages at
  amalmehta.github.io/soccer_viz. The build output moved from site/ to docs/ because Pages serves
  a branch folder, so a push now deploys. README covers what it does, the layout, how to add a clip
  and the rights position, with three UI screenshots (Arcade mid-goal, Broadcast, analysis and
  controls) captured from the running app with headless Chrome over the DevTools protocol.
- 2026-09-28 — "things to learn from this play" (user request): each play now carries "lessons",
  3-4 short coaching points shown in a card under the analysis. Added to all 19 plays, to the
  AI play schema so generated plays include them, and to the checker (3-4 entries, label ≤24,
  text ≤220, same no-he/she wording rule, nothing silently dropped).
- 2026-09-28 — live play-by-play (user request): a timestamped feed under the controls fills in as the
  clip runs, current line highlighted and kept in view, every line clickable to seek, with a Live dot
  while playing. Key moments (goal, save, tackle, and the special actions: volley, bicycle kick,
  header, chest, sliding tackle, keeper dive) carry a badge and an accent tick on the timeline; a goal
  landing on the same moment as the strike badges that line instead of adding one. Built from the
  play's own captions, events and actions, so every clip and any AI play gets one with no new data.
  Claude version republished as Version 20.
- 2026-09-28 — StatsBomb importer (user request): tools/import_statsbomb.py turns a goal in the
  StatsBomb open data into a play file — the ball's real path from the pass, carry and shot records,
  every player the data places (including the shot's freeze frame), shirt numbers and playing names
  from the lineups, and the special pose for a volley, overhead kick or diving header. Old matches
  are timed to the nearest second, so the timeline is stretched until passes and shots travel at
  believable speeds, player positions are pulled back to somewhere reachable, and long gaps are
  broken into steps so the curve through the keyframes doesn't swing into a false sprint; ball
  timing and player positions settle together over a few passes. Words (title, captions, commentary,
  analysis, lessons) and kit colours come out as TODO placeholders. Three goals are covered by the
  open data and import clean: Carlos Alberto 1970, Maradona 1986, Bale 2018.
- 2026-09-28 — Maradona 1986 rebuilt from the real data (user request): the ball's path, its timing
  and the tracked players now come from StatsBomb match 3750191, so the run, the turn away from
  Beardsley and Reid and the order of defenders beaten are the recorded ones rather than memory.
  Players the data only sees in the shot's freeze frame (Butcher, Fenwick, Shilton, Stevens,
  Valdano, Burruchaga) have hand-drawn routes that end exactly where the data puts them, and the
  rest of both teams are unnamed so the off-ball engine moves them. Words, kits and venue are the
  hand-written ones. 19.9 s instead of 16.2 s, because the real build-up starts two passes earlier.
- 2026-09-28 — Carlos Alberto 1970 and Bale 2018 rebuilt from the real data (user request): both now
  carry StatsBomb's ball path and timing (matches 3888702 and 18245), so the 1970 move runs the full
  25 s from Clodoaldo's dribble through Rivelino and Jairzinho to Pelé's lay-off, and the Kyiv goal
  starts three passes earlier at 23 s, with Bale's overhead kick taken straight from the shot record.
  Players the data only sees at the shot have hand-drawn routes into those positions; the rest of
  each team is unnamed so the off-ball engine moves them. Also fixed: the importer folded accents
  out of ids (Pelé, Gérson, Modrić, Mané now import as pele, gerson, modric, mane).
- 2026-09-28 — checked every clip against the StatsBomb open data: only the three already rebuilt
  (1970, 1986, 2018) are covered. Their Champions League set is finals only, their Premier League
  set is 2003/04 and 2015/16, and of the old World Cups they hold 1958, 1962, 1970, 1974, 1986,
  1990, 2018 and 2022 — so Zidane 2002, Ronaldinho 2005, Iniesta 2010, Agüero 2012 and the rest
  cannot be upgraded. Added instead (user choice): Di María's goal in the 2022 final, imported from
  match 3869685 and finished by hand. The library is 17 clips and 2 moves.
- 2026-09-28 — three more data-backed clips (user request): Pavard's volley (match 7580), Schick
  from the halfway line (3788748) and Gerrard's header in Istanbul (2302764), each imported and then
  finished by hand. Two importer bugs fixed on the way: a player first seen in an opponent's freeze
  frame was put on the wrong team, and the non-scoring side of any shot was labelled team B even
  when the shot belonged to team B. Finishing is now a shared pass: players the data sees only at
  the shot get a route drawn back from that spot, and routes are nudged apart so nobody stands
  inside anyone else. Library: 20 clip files plus the built-in Messi clip and 2 moves.
- 2026-09-28 — commentary voice (user: "sounds robotic again on these new clips"): lines are now
  split into breath-sized units — first at their pauses as before, then any stretch over ~46
  characters at a comma or a joining word — so the voice resets its intonation more often instead of
  reading a long clause flat. Each unit also gets a small fixed wobble in rate and pitch, and a
  clause left hanging keeps its pace up. Awkward names are respelled for the voice only (Schick →
  Shick, Riise → Ree-suh, Souček → Sow-chek, Kanté → Kon-tay and about forty more); captions and
  labels keep the real spelling. Verified by recording what the page asks the voice to say.

