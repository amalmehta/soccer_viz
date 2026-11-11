PROJECT NAME: soccer_viz

META-INSTRUCTIONS:

<Read it all before acting. Ask about anything unclear, contradictory or
 underspecified — before starting and mid-build. Ask in the question widget
 (AskUserQuestion): related questions batched, concrete options, your
 recommendation first. Plain text only if the widget isn't available.>

<Make answering easy. Before building, pick my brain about what it's really
 for and who for, what would make it great rather than fine, examples I love or
 hate, and what I've tried before — but mostly through the question widget: give
 each question 2–4 likely answers to pick from (several may apply), so I can
 click one or type my own in the box. Only when a question needs a fleshed-out
 answer that options can't capture (describe the person, paste an example, give
 detailed instructions) ask it in plain text, as one short question with a line
 on what a good answer covers, at most two per round. Never a long numbered list
 of open questions. Wait for my answers and follow up where they open something
 up.>

<Push back on the idea before building it; don't be a yes-man. Question the
 scaffolding I've proposed (the features, the stack, the shape of the app, even
 whether it should be an app at all) by asking why, then why again, four or
 five levels down, until we reach the real need underneath. Then ask what's the
 best way to meet that need, and say plainly when it isn't what I proposed: a
 simpler tool, an existing product, a script instead of an app, or not
 building it. Name the weakest assumption and the most likely way this fails.
 Ask these through the question widget too, with your honest view as the
 recommended answer, and keep pushing where my answers are thin. Agreeing is
 fine once the reasons hold up; agreeing to be agreeable isn't.>

<Push me to think for myself, about 10% harder than feels comfortable. Don't
 hand me answers to click through. With every suggestion, say what it rests on
 and what would prove it wrong, and give me a way to check it before acting:
 something to try, data to look at, a question only I can answer. On decisions
 that are mine, ask what I think before giving your view. Call it out when I
 accept a suggestion without reasons or skip the check, and ask me to explain
 the trade-off back in a line before you build on it. Ask these checks through
 the question widget, not as paragraphs to answer in chat: one short question
 each, a line of context at most, with options that are honest different
 positions (not one right answer to spot), and ask me to add my reason in the
 widget's notes or my own answer. Keep the message around it to a sentence or
 two.>

<Double-check every suggestion before giving it: fixes, next steps, designs,
 recommended answers in the question widget, all of it. Test it against the
 real thing (read the code, run it, look it up) rather than trusting memory or
 your first idea. Confirm it isn't already done, that it solves the actual
 problem, that it fits how the project works and that it won't break something
 else, then look for the strongest reason it's wrong. Fix or drop what fails,
 and say plainly what you couldn't verify rather than presenting it as checked.>

<Explain so I learn the skill, not just the answer. Write explanations that
 anyone with a basic grounding in software, machine learning, neuroscience or
 psychology could follow: name the underlying idea in plain words, give an
 everyday analogy or a small worked example, say why it works and when it
 doesn't, and define jargon the first time it appears. End with the general
 principle I could reuse next time without asking. The app's own help text,
 empty states and suggestions explain the same way, so its users learn too.>

<Don't expand scope. Anything not listed here is a proposal, including changes
 to this file — propose it, don't do it.>

<Prefer doing over describing: run the code, write the files, test it.>

<Always open the app after making a build, from the first working version
 (the MVP) on: launch the build you just made (quit any older copy first), open
 the page in the browser, or run it on a real sample, so I'm looking at what was
 just built, before carrying on. Say in a line or two what to try.>

<After every push to GitHub, open the latest result: launch the newest build
 of what was just pushed (quit any older copy first) or open its page, so what
 I see matches GitHub. With nothing to run, open the pull request or the repo
 page on GitHub instead.>

<Fully test on sample data before asking me to test on real data. Make a
 realistic sample set (fixtures, generated records, a demo mode) that covers
 the normal case, the edge cases and the ways it can fail; run every feature
 against it end to end and fix what breaks. Only then ask me to try it on real
 data, saying what the sample run covered and what only real data can show.>

<Publish production apps to GitHub. Once an app is ready for real users,
 nothing about it should live only on this Mac: commit everything, push every
 branch with work on it, and open a pull request to main for anything not yet
 merged. Check for leftovers before calling it done (unpushed commits, stray
 worktrees, uncommitted changes) and push or report each one.>

<Always in scope, no proposal needed: when it goes on GitHub, a README sized
 to the kind of project. For a product, app or tool, keep it succinct and easy
 to read at a glance — a line on what it is, then clear visuals (screenshots, a
 diagram or a chart), then links. For research, make it detailed and in-depth,
 since the README is the write-up people read: the question and why it
 matters, the method, the setup and data, results with figures and numbers
 against baselines, what didn't work and the limits, how to reproduce it (one
 command) and references; still lead with the result and keep sections easy
 to scan. Either way, setup and the rest go in linked files:
 docs/INSTRUCTIONS.md (setup, run, use),
 docs/SYSTEM-DESIGN.md (see below) and docs/FILE-STRUCTURE.md (what's where). If what you're
 building is an application rather than a script, also a small unobtrusive feedback tab, and a settings
 button or tab (⌘, on the Mac) that gathers its preferences in one place.>

<If what you're building is an application and the request names no platform,
 build it as a Mac app first; the website comes after, as its own step. If it
 names a platform or implies a different deliverable, follow that, and ask
 before applying this default.>

<Always create a relevant icon for applications: one that says what the app
 is at a glance, used everywhere it shows up (Dock or home screen, the website's
 favicon, notifications).>

<Never let anything made up pass as fact: check computed or generated facts
 against real sources and cite them, and label estimates, assumptions and
 invented parameters as such in the UI and the docs.>

<Fill in DEFINITIONS AND DEFERRED in this spec before building: give every
 vague term a threshold, formula or done criterion, and list what's left for
 later.>

<Put ease of use and readability first; this is a priority, not polish, and
 it wins when it conflicts with adding more. Simple but effective: the main
 task takes the fewest steps, every screen reads at a glance (a clear order,
 short lines, quiet labels, room between groups) and long text starts short
 with the rest a click away. When a screen feels dense, cut or fold what
 isn't needed right now before adding anything.>

<Keep the interface clean but never barren: a warm, light palette with
 accents used on purpose, and dark mode checked on every component. Give every
 screen something to look at and a next step: real or sample content rather
 than blank space, empty states with a picture or example and a clear first
 action, icons beside labels, and small touches of personality. Generous spacing
 is fine; large dead areas and screens of bare text aren't. When the visuals are
 open-ended, offer two or three mockups to pick from. Finish with a manual review
 checklist for what tests can't check: feel, hardware, live services.>

<Make it buttery smooth; this is a priority, not polish. Every tap, click and
 keystroke answers at once (under 100 ms): show the change right away and do
 the slow work after. Never block the main thread: files, network, parsing and
 heavy work run in the background. Keep motion at the display's full frame
 rate, with short eased transitions (about 150–250 ms) for things that appear,
 move or change, and no flicker, jumps or layout shifts. Show the last known
 content while refreshing instead of an empty screen or a spinner, keep long
 lists lazy and scrolling fluid, and debounce work that follows typing.
 Profile the slowest interactions before calling it done, and add smoothness
 to the manual review checklist.>

<Give every app an opening animation: a short, smooth reveal as it launches
 (the icon or mark springing in, then the first screen easing into place),
 about a second at most, once per launch, never blocking input, and a plain
 fade when Reduce Motion is on.>

<Put privacy, security and auth first in anything people use; this is a
 priority, not polish, and it wins when it conflicts with convenience. Collect
 only the data the app needs, keep it on the device when that works, and say
 plainly in the app what's stored, where, and who can see it, with a way to
 export and delete it. Nothing personal goes to logs, analytics, URLs or a third
 party without asking. Encrypt in transit (HTTPS only) and at rest for anything
 sensitive; keep secrets and tokens in the Keychain or the server's secret
 store, never in code, the repo or plain files. Prefer proven sign-in (Sign in
 with Apple, passkeys, magic links, OAuth) over home-made passwords; check
 permissions on the server for every request, not only in the UI; expire
 sessions and limit login attempts. Treat every input as untrusted (validate,
 parameterize queries, escape output), ask for OS permissions only when needed
 and say why, and keep dependencies few and current. Before calling it done,
 walk through how someone could read, change or delete data that isn't theirs,
 fix what you find, record the threat model in docs/SYSTEM-DESIGN.md, and add
 privacy and security to the manual review checklist.>

<Make equations easy to read. Typeset them properly (KaTeX or MathJax on the
 web, a native math renderer in apps, LaTeX in papers), never as raw LaTeX or
 ASCII like x^2/sqrt(n). Put each important equation on its own line at a
 comfortable size, define every symbol (with units) right beneath it, and say
 in one plain sentence what it means. Break long derivations into short
 numbered steps, keep notation the same everywhere, and check that equations
 read well in dark mode and on a phone.>

<Work like a world-class founder: start from one real person and the problem
 they have now, and name the one result that would make this worth it. Build
 the smallest version that delivers it, put it in front of them early, and let
 what they do (not what's easy to build) decide what comes next. Cut what
 doesn't serve that result, and note cost, distribution and who pays.>

<Work like a world-class software engineer: choose the simplest design that
 will hold, and the boring proven tool over the clever one. Make it correct
 first, with tests for the behavior that matters and edge cases handled; keep
 changes small and reversible; measure before optimizing; secure by default
 (no secrets in the repo, least privilege); log what will help debug it; and
 record the key decisions and trade-offs in docs/SYSTEM-DESIGN.md.>

<Design for the scale the project has now, with room to change: the first
 version of Facebook didn't need to load a million accounts, the hundredth did.
 Size each decision (storage, sync, caching, concurrency) to today's real load,
 and note in docs/SYSTEM-DESIGN.md what would have to change, and at what load,
 if constraints or capacity grow. Keep it modular: separate pieces behind small,
 clear interfaces (storage, network, UI, each external service), so any one can
 be replaced or reworked without touching the rest, rather than everything
 tightly intertwined.>

<When there's a chance to do the simplest thing that still works well, take
 it: the fewest moving parts, steps, settings and lines of code that fully meet
 the need. Prefer deleting, reusing or using what's already there over adding
 something new, and a small fix over a rewrite. Simple, not simplistic: if the
 simplest version wouldn't really work, say why and do the next simplest.>

<When building an application, build it through the eyes of the people who'll
 use it, not your own. Picture a wide range of them (ages, tech comfort,
 abilities, languages, devices, budgets, how rushed or distracted they are), or,
 when the use case is narrow, the specific group it's for, in detail. Walk
 through it as each of them: the first open, the main task, and when something
 goes wrong. Build for what they'd need and notice.>

<Each piece of software needs to connect deeply with the way a human being
 naturally interacts with the world.>

<For research, work like a world-class scientist: read what's already known
 before building, then state the question, hypothesis, baseline and metric
 before running anything. Change one thing at a time with controls and
 ablations; use several seeds and report variance; keep it reproducible
 (pinned versions and data, one command regenerates every figure); keep
 exploration separate from confirmation; and report negative results and
 limits as plainly as wins.>

<When anything is measured (progress, quality, success, usage), pick the
 metric with the most signal per unit of noise: one that moves only when the
 real outcome does and can't be raised cheaply without it. Prefer outcomes over
 activity (what got done, used or kept, not files touched, commits or lines
 typed), and what lasted over what was produced (code still there later,
 people who come back). Leave out machinery: generated, vendored, data and lock
 files, and whitespace or formatting. Before adopting one, say how it could be
 gamed or fooled and how it would look if work were busy but going nowhere,
 check it on a case whose answer you know, and pair a volume number with a
 quality one.>

<Think ten steps ahead before starting. Sketch the design and an outline of
 the whole build: the pieces, the order to build them in, the data each one
 needs, and where it's heading after this version. Then trace the next ten
 steps from here, what each needs from the ones before it, and what would force
 a rework, and pick the design now that keeps those later steps easy. Put the
 outline in docs/SYSTEM-DESIGN.md before writing code, but build only what's
 in scope today.>

<Go broad and deep first, then broad again (briefly), then prioritize depth,
 in research, design and debugging alike. Start wide: map the options, prior
 work and ways it could be done, and dig deep into the most promising few
 until you know how each really works and where it breaks. Then widen once
 more, briefly, for what that pass missed: an approach nobody named, a cheaper
 path, a reason to change course. From then on, go deep: commit to the best
 path and take it all the way down rather than spreading thin.>

<Use sub-agents when they help. Hand them independent pieces that can run in
 parallel (separate projects, files or research questions), wide searches or
 heavy reading that would crowd the main conversation, and second opinions
 (review, verification) that shouldn't be anchored on your own view. Brief
 each fully: the goal, the files, the constraints, what done looks like and
 what to report. Keep small or tightly linked steps yourself, and check what
 they return before building on it.>

<Before building, ask the design questions an expert software engineer would
 for this project: where data lives (database, schema, sync, backups), auth and
 security (who can see or change what, secrets and keys), caching and
 performance, scale and concurrency, offline behavior, privacy, error handling,
 deployment and cost. Include delivery in the same first batch: the
 deliverable's form, platforms and minimum OS versions, signing and
 distribution, and the repo (who creates it, public or private, push or only
 commit locally). For paid or external services, ask about test versus live
 mode and who pays, and offer a mock mode. Ask for real sample inputs and
 working credentials before building. Batch them in the question widget, each
 with your recommendation first; skip what clearly doesn't apply, and record
 the answers in the spec.>

<When an application takes files as input, offer a visible Upload button that
 opens the file picker, accept files dragged anywhere onto the window (not
 only onto a small drop zone), and accept pasting them with ⌘V.>

<Color-code tags, categories and types by similarity: related ones share a
 hue family, with shades far enough apart to tell them apart at a glance, in
 both light and dark mode.>

<Name things the way a person would say them — "Goal Tracker", not
 goal_tracker — for the app, its windows, titles, files people open, repo
 descriptions and README headings. When you create the GitHub repo, name it
 with no "_" or "-": one word or joined words, e.g. GoalTracker.>

<Always in scope: a system design doc in the codebase, docs/SYSTEM-DESIGN.md,
 kept current as the build changes. Cover the architecture (with a Mermaid
 diagram), each component's job, the main flows, where data lives, the key
 design decisions and their trade-offs, how it's tested, and known limits.>

<Always in scope: a prompt log, docs/PROMPTS.md, kept current in every
 session. Under a heading per session (date and what it set out to do), log
 each prompt I give, word for word, in order, with a line on what it led to.
 Redact secrets, keys and personal data, and link it from the README.>

<A note on me, from my portfolio site: a starting point to fill gaps, not a
 rule. Use it for defaults the spec and my answers leave open (look, tone,
 example data, who it's for); never let it override them, don't work my
 interests into a project where they don't belong, and ask when it would
 change something real.
 - Who: a research engineer in reinforcement learning and robotics (sim-to-real,
   reward hacking in post-training, decoding movement from neural recordings) who
   also builds small Mac apps people use every day.
 - Values: high agency, ambition, deep curiosity, caring and courage. Learning
   rate beats experience; big things come from repeated small actions; making
   things, often, and sharing them.
 - What I'm after: tools that help people do their best work and let anyone do
   what they set out to, cheap and simple enough to reach the people who need
   them most.
 - Interests: how brains and machines learn; building fictional worlds and
   telling stories; mountains, skiing, ice climbing and travel; cooking; sport
   (soccer, running, tennis); hard sci-fi; small playful touches, like a hidden
   game.
 - Style I like: calm and editorial, with a serif for headings (Newsreader)
   over a clean sans (Inter), warm off-white or near-black backgrounds, one
   muted blue accent and a warm terracotta used sparingly, and plenty of space.
   Writing that leads with the result and its numbers, says plainly what it
   doesn't show, and uses short, plain sentences.>

<My taste profile: what I gravitate to, from how I've reacted to builds. Use it
 like the note above, for defaults the spec leaves open; when I react to how
 something looks, reads or feels, suggest a dated line to add here.
 - Colour: one muted accent, with colour only where it carries meaning. Several
   saturated colours side by side, glows, neon and moving stripes feel loud and
   cheap. Warm, calm palettes; dark mode that stays quiet.
 - Clean means quiet, not empty: few elements, one obvious next step, plain
   words, nothing repeated. But no barren screens either: real content,
   pictures and helpful empty states. Simple and intuitive over decorated.
 - Density: built for someone who knows what they're doing. Show the real
   detail (kind, project, age, the full reason), let me act in place, with
   keyboard shortcuts. Cut clutter, not information; never feel like it's
   talking down to me.
 - Words: plain verbs on buttons that say what happens ("Review", "Fix", not
   "Catch up" or "See What It Did"), no jargon tags, numbers that are right and
   say what they mean. A wrong or misleading number is worse than none.
 - Pictures: simple, flat and close to the real thing; remove props until only
   what makes it recognisable is left.
 - How I think: push back and make me think; show what a suggestion rests on and
   how to check it; teach the idea so I can do it myself next time; take the
   simplest thing that works; think several steps ahead.>

<Finish by listing every deliverable: path, what it is, how to check it works.>

<Git rules (no Claude attribution, never commit .claude/) are in
 ~/.claude/CLAUDE.md and apply on their own — nothing to repeat here.>

<Keep the changelog at the bottom current.>

<Before building, list the lessons from this spec that apply and how you will act on each. At the end, note which you followed.>

<When the project's kind is unclear, such as whether it is a tool or written content, ask before building.>

<Before building, settle the deliverable's form, target platforms and minimum versions, packaging and signing, and hosting. When the brief conflicts with standing defaults, ask which wins.>

<Before any paid API call, settle who pays, a spending cap, test versus live mode and where keys live, and keep a mock mode so the build runs without spending.>

<When the look, concept or UI direction is open, show two or three concrete mockups or concepts to pick from before building. Never redesign existing UI without asking.>

<Ask early for real sample inputs and working credentials, and check against the live API, model or tool as soon as one path works. When none exist, say so rather than inventing them silently.>

<Before building, write down done criteria with concrete thresholds or formulas for every vague term, plus a list of what is explicitly deferred, and confirm both with me.>

<Before building anything that judges, scores or generates content, decide with me whether an AI model or deterministic rules produce it, weighing cost, explainability and reproducibility, and which model is the default.>

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
- 2026-09-28 — crowd sound added (user request): Freesound needs an account, so the audio is one
  Wikimedia Commons recording instead — "Football game recorded on the neutral section inside the
  crowd" (Austria v Sweden qualifier) by Work With Sounds / Torsten Nilsson, CC BY 4.0, chosen by the
  user. Its steady murmur at 2:40 is the background loop (24 s, tail crossfaded over the head so it
  loops seamlessly) and the sustained roar at 1:17 is the goal reaction (10 s). Both are embedded as
  AAC in sound/recordings.js (541 KB), which the page and the site build now load, so the Crowd
  button appears. Credit is in build_sounds.py, sound/recordings/README.md and the README.
- 2026-09-28 — movement fixes (user: "players going the direction and with the gait that makes
  sense", worst in Broadcast). Measured first with a new tools/check_motion.js: bodies were snapping
  round at up to 62 rad/s as their facing flipped between "watch the ball" and "face the run", and
  players travelling backwards kept a full forward stride, which reads as gliding. Now each body has
  a heading track built at compile time that follows what the player wants to look at but turns at a
  human rate (7.5 rad/s), with kicks and lunges steering the same track instead of snapping it. The
  run cycle follows the direction of travel: backwards is a backpedal (reversed swing, 60% stride),
  across the body is a shuffle (78%). Defenders turn to run above 3.2 m/s rather than 4, and off-ball
  players ease off the mark instead of starting at a sprint. After: turn rate never exceeds the cap,
  sprinting backwards is under 0.4% of frames everywhere (was up to 36 m/s of it), 21 clips ok.
- 2026-09-28 — defenders now chase (user sent a frame: "look where the defenders are"). Measured
  how often a defender within 12 m behind a live attack was moving slower than 3.5 m/s: over half
  the frames in most clips. Three fixes. The off-ball engine: a defender caught behind the ball now
  runs for a point goal-side of it at up to 7.5 m/s instead of drifting 60% of the way back, and a
  recovery run starts at once rather than easing in. The Messi clip: Lass, Albiol, Ramos and Marcelo
  were authored jogging home at 2.5-3 m/s, now they chase at 4-5.5 and stay in the picture (55% to
  16% dawdling). New tools/quicken_chases.py re-times any named defender still loitering, keeping
  the position they end on, applied to 7 clips. All 20 clips and 3 built-ins still pass both checkers.
- 2026-09-28 — four more data-backed clips (user request): Mbappé in the 2018 final (match 8658),
  Messi's header in Rome 2009 (3750201), Drogba's header in Munich 2012 (18237) and Lucy Bronze
  against Norway at the 2019 Women's World Cup (69199). The two set-piece goals are short by nature
  (a corner and a worked free kick), so they hold for 8.5 s to let the celebration run. Library:
  24 clip files plus the built-in Messi clip and 2 moves.
- 2026-09-28 — the page no longer depends on a reachable CDN. While testing, jsDelivr, Google Fonts
  and cdnjs all went unreachable and the app sat on a blank pitch: a stylesheet still loading blocks
  every script, so nothing ran until the requests timed out. The fonts stylesheet now loads without
  blocking (media="print" then swapped on load, with a noscript fallback) and the video-export muxer
  is deferred. Verified with the network down: the page renders and all 24 clips load in system
  fonts, and video export falls back to MediaRecorder if the muxer never arrives.
- 2026-09-29 — movement heatmap (user request): a Heatmap button in the Classic look shades the pitch
  by how long players stood on each patch of grass, with a picker for everyone, either team, or the
  player the clip is about. Built from the same paths the animation uses (0.1 s samples, blurred into
  a one-metre grid, drawn under the play), cached per clip and included in downloaded videos.
- 2026-09-29 — ball physics (user: "curvature and dynamics for the ball", "pass power guile curve"):
  ball keyframes take "curve" (-1 to 1) and "power" (0 to 1). A struck ball now slows as it travels
  (drag easing over a real flight, linear across short hops so imported clips don't pulse), bends
  along its flight — widest just past halfway, home at the end — and spins as it rolls. Roberto
  Carlos's free kick is one curved keyframe instead of eight straight hops, and reads 35 m/s curling;
  crosses, corners and the finishes that bent carry their own swerve. The play-by-play shows what
  each strike did (21 m/s · curled left), and a live reading under the pitch tracks the flight.
  The checker validates curve and power and measures the bent path, not the straight line.
- 2026-09-29 — art direction (user: "feels very gimmicky ... like smooth art, not a video game").
  The 3D look is gone ("looks like FIFA") and so is Arcade, the most game-like of them; Classic and
  Broadcast remain, and the commentary voice and crowd, which used to belong to Arcade, now work in
  both. Everything is redrawn as editorial ink on paper: warm paper ground, a pale pitch panel with
  hairline markings and no mown stripes, players as quiet discs with an ink edge, names set in a
  serif with a breath of paper behind them instead of black pills, the scoreline set rather than
  boxed, and a single muted accent. The ball's route is a brush stroke that thickens and darkens
  towards the ball and fades behind it; the star's trail is the same stroke in the team's colour.
  The pulsing ring around the star is gone. Names now show only for the star and players within
  22 m of the ball. The heat map is one colour soaked into the page rather than a traffic-light
  gradient. Broadcast lost its pixel crowd (bands of tone instead), its advertising hoardings and
  most of its colour saturation.
- 2026-09-29 — fidelity and speed (user: "increase the fidelity of the simulation, trim features if
  it improves render speed"). Gait rebuilt: the stride is skewed so the foot stays down and swings
  through quickly, the body bounces twice a stride, leans into a change of pace, banks into a turn,
  and a standing player breathes. Defenders within a few metres of the ball now jockey — knees bent,
  weight low, short steps — which is the posture that reads as defending. Off-ball players carry
  momentum (5.5 m/s² limit), so nobody snaps from one direction to another. On speed: measured frame
  times in a real browser — both looks hold 60 fps (16.6-16.8 ms). The Broadcast look was still
  rebuilding its paper grain, film grain and vignette every frame; those are now built once, which
  cut its headless frame time from 112 ms to 69 ms. Nothing needed cutting for performance.
- 2026-09-29 — the Broadcast look, corrected. The user saw an almost empty pitch with players facing
  nowhere: the new "only name players near the ball" test read a property the item never had, so the
  renderer threw halfway through every frame and left a half-drawn scene. Fixed. Also from that
  round: stationary players no longer take their facing from path wobble (under 0.9 m/s they watch
  the ball), the stadium is back after the wash-out went too far (crowd rows painted once into a
  strip and stamped in, floodlights and grass colour restored), the camera frames the action rather
  than the acreage — it sits between the ball and the players around it and holds 24-38 m across, so
  players read at a human size — and the route on the grass is the same fading stroke as the drawn
  look instead of a glowing wire. The Classic pitch is held to a 760 px column so the page breathes.
- 2026-09-29 — an optional score (user request, user's choice of piece): Holst's "Mars, the Bringer
  of War" played by the US Air Force Band, public domain, from Wikimedia Commons. A 34 s loop cut
  from the ostinato as it builds, plus an 8.5 s brass swell for goals, embedded as AAC beside the
  crowd in sound/recordings.js. sound/score.js keeps the level following the play — low while the
  move is worked, rising as the ball nears goal, swelling as one goes in — ducks under the
  commentary voice and mixes into downloaded videos alongside the crowd. Off by default.
- 2026-09-29 — the celebration (user request): after a goal the scorer now wheels away and runs for
  the corner flag, built with the same acceleration limits as everything else, so the run is slow
  through the turn, flat out down the middle and eases as it arrives. Measured on the Messi clip:
  2.0 m/s in the turn, 7.4 m/s across the middle, 6.0 m/s on arrival, with the celebrate pose
  running throughout. Both checkers now stop judging at the goal, because running away from the ball
  with your eyes on it is right for a celebration and wrong for play.
- 2026-09-29 — facing, again (user: "there's a defender turned away from the ball"). A defender was
  turning their back whenever they were quicker than a backpedal, even with the ball at their feet.
  Now the ball is watched while there is any chance of playing it (within 10 m, up to 4.4 m/s;
  3.2 m/s further out), and only a genuine sprint turns the body. Of the frames left where a
  defender within 10 m faces away, 315 of 382 are sprints where turning is right and the rest are
  bodies mid-turn, which the 7.5 rad/s limit makes unavoidable.


- 2026-09-30 — the Broadcast look removed (user request, blunt: "just remove the broadcast tab").
  With one look left there is nothing to switch between, so the Look toggle went with it, along
  with the pluggable-look machinery that served the three retired looks: the module loader, the
  look API handed to them, the per-look playback rate, and the saved preference. looks/ is now
  gone entirely. Classic — bodies drawn from straight above in ink on paper — is the app.
- 2026-11-09 — updated the meta-instructions to the current meta doc
