// normalizePlay is the gate. Every play reaches the renderer through it — the ones in the library,
// the three built into the page, and whatever Claude hands back when somebody types a request. The
// renderer trusts what comes out of it completely, so what it lets through, what it bends into
// range and what it refuses outright is the most consequential behaviour in the app.
"use strict";
const { normalizePlay, slugify, MIN_GAP } = require("./app");
const { basePlay, playWith } = require("./fixtures");
const { test, ok, equal, same, close, within, throws } = require("./harness");

test("a well-formed play comes through with nothing lost", () => {
  const raw = basePlay();
  const p = normalizePlay(raw);
  equal(p.players.length, raw.players.length, "players");
  equal(p.ball.length, raw.ball.length, "ball keyframes");
  equal(p.captions.length, raw.captions.length, "captions");
  equal(p.events.length, raw.events.length, "events");
  equal(p.actions.length, raw.actions.length, "actions");
  equal(p.lessons.length, raw.lessons.length, "lessons");
  equal(p.duration, 6, "duration");
  equal(p.teams.A.name, "Reds", "team A name");
  equal(p.players[0].path.length, raw.players[0].path.length, "the star's keyframes");
  same(p.players[0].path[0], [0, 60, 34], "the star's first keyframe");
});

test("anything that is not a play is refused rather than half-drawn", () => {
  for (const junk of [null, undefined, "a play", 7, [], [basePlay()]]) {
    throws(() => normalizePlay(junk), /wasn't a play/, `${JSON.stringify(junk) || String(junk)} refused`);
  }
  // Claude is asked to explain itself rather than invent a play it cannot reconstruct, and that
  // explanation is what the viewer should read
  throws(() => normalizePlay({ error: "I don't know that match." }), /don't know that match/, "an error in place of a play");
});

test("a play the renderer could not animate is refused", () => {
  throws(() => normalizePlay(playWith({ players: [basePlay().players[0]] })), /enough players/, "one player");
  throws(() => normalizePlay(playWith({ players: [] })), /enough players/, "no players");
  throws(() => normalizePlay(playWith({ ball: [] })), /without a ball/, "no ball");
  // A player with no usable keyframes is not a player: two such and the play has nobody left
  throws(() => normalizePlay(playWith({ players: basePlay().players.map(p => ({ ...p, path: [] })) })), /enough players/, "nobody with a path");
});

test("keyframes are pulled onto the pitch and put in time order", () => {
  const p = normalizePlay(playWith({
    players: [
      { id: "wild", team: "A", path: [[4, 300, 34], [0, -40, -30], [2, 50, 90]] },
      ...basePlay().players.slice(1)
    ]
  }));
  const wild = p.players.find(x => x.id === "wild");
  same(wild.path.map(k => k[0]), [0, 2, 4], "times sorted");
  same(wild.path[0], [0, -2, -2], "first keyframe clamped to the pitch area");
  same(wild.path[1], [2, 50, 70], "a keyframe off the far touchline");
  same(wild.path[2], [4, 107, 34], "a keyframe past the goal line");
});

test("keyframes crowded into a blink are merged, the later reading winning", () => {
  // Imported clips land their keys on event times, which cluster: three readings a twentieth of a
  // second apart would ask a body to cover a metre between two frames.
  const p = normalizePlay(playWith({
    players: [
      { id: "crowded", team: "A", path: [[0, 20, 34], [2, 30, 34], [2.05, 31, 34], [2.1, 32, 34], [2 + MIN_GAP + 0.01, 33, 34]] },
      ...basePlay().players.slice(1)
    ]
  }));
  const path = p.players.find(x => x.id === "crowded").path;
  // The run of crowded readings collapses into one, and it is the last of them: each in turn
  // replaces the one before, so the body ends up where the most recent reading puts it.
  same(path.map(k => k[0]), [0, 2.19], "four readings in a fifth of a second");
  same(path[1], [2.19, 33, 34], "the latest reading of the crowd is the one kept");
});

test("what the renderer cannot draw is dropped, not passed on", () => {
  const p = normalizePlay(playWith({
    events: [{ t: 1, type: "pass", team: "A" }, { t: 2, type: "nutmeg", team: "A" }, { t: 3, type: "shot", team: "Z" }],
    actions: [
      { t: 1, id: "striker", type: "volley" },
      { t: 2, id: "striker", type: "backflip" },
      { t: 3, id: "nobody", type: "header" }
    ],
    players: basePlay().players.map((pl, i) =>
      i === 0 ? { ...pl, look: { skin: "chartreuse", hair: "mullet", beard: "stubble", height: 400 } } : pl)
  }));
  same(p.events.map(e => e.type), ["pass", "shot"], "an invented event type");
  equal(p.events[1].team, "A", "an unknown team falls back to A");
  same(p.actions.map(a => a.type), ["volley"], "an invented action, and one for a player who is not in the play");
  const look = p.players[0].look;
  equal(look.skin, undefined, "a colour that is not in the palette");
  equal(look.hair, undefined, "a hairstyle the renderer has no drawing for");
  equal(look.beard, "stubble", "a feature that is in the palette");
  equal(look.height, 205, "a height clamped to something human");
});

test("numbers are bent into range instead of being believed", () => {
  const p = normalizePlay(playWith({
    duration: 900,
    score: [40, -3],
    players: basePlay().players.map((pl, i) => (i === 0 ? { ...pl, num: 1000 } : pl)),
    ball: [
      { t: 0, with: "striker" },
      { t: 2, x: 50, y: 34, curve: 9, power: 40 },
      { t: 3, x: 60, y: 34, curve: -9, power: -5 }
    ]
  }));
  within(p.duration, 4, 30, "a duration of fifteen minutes");
  same(p.score, [20, 0], "a scoreline out of range");
  equal(p.players[0].num, 99, "a shirt number of 1000");
  equal(p.ball[1].curve, 1, "curve above the limit");
  equal(p.ball[1].power, 1, "power above the limit");
  equal(p.ball[2].curve, -1, "curve below the limit");
  equal(p.ball[2].power, 0, "power below the limit");
  // A play is never shorter than the last thing that happens in it
  equal(normalizePlay(playWith({ duration: 1 })).duration, 6, "a duration shorter than the play");
});

test("exactly one player is the one the clip is about", () => {
  const p = normalizePlay(playWith({
    players: basePlay().players.map(pl => ({ ...pl, star: true }))
  }));
  equal(p.players.filter(pl => pl.star).length, 1, "stars");
  equal(p.players[0].star, true, "the first one asked for wins");
});

test("kits stay legible whatever the play asks for", () => {
  const teams = basePlay().teams;
  const p = normalizePlay(playWith({
    teams: { A: { ...teams.A, color: "#101010", text: "#121212" }, B: { ...teams.B, color: "#131313", color2: teams.A.color2 } }
  }));
  ok(p.teams.A.text !== "#121212", "unreadable shirt text replaced");
  ok(p.teams.A.color.toLowerCase() !== p.teams.B.color.toLowerCase(), "two teams in the same colour pulled apart");
  equal(p.teams.A.pattern, "plain", "a pattern the renderer knows");
  equal(normalizePlay(playWith({ teams: { A: { ...teams.A, pattern: "tartan" }, B: teams.B } })).teams.A.pattern,
    "plain", "a pattern it does not");
});

test("a play that runs on forever is cut to what the page can show", () => {
  const many = n => Array.from({ length: n }, (_, i) => ({ t: i * 0.04, text: `line ${i}` }));
  const p = normalizePlay(playWith({
    players: Array.from({ length: 40 }, (_, i) => ({ id: `p${i}`, team: i % 2 ? "A" : "B", path: [[0, 10 + i, 34], [6, 12 + i, 34]] })),
    captions: many(30),
    commentary: many(30),
    events: Array.from({ length: 40 }, (_, i) => ({ t: i * 0.1, type: "pass", team: "A" })),
    lessons: Array.from({ length: 9 }, (_, i) => `lesson ${i}`),
    analysis: Array.from({ length: 9 }, (_, i) => ({ label: `part ${i}`, text: "something about the move" }))
  }));
  equal(p.players.length, 26, "players");
  equal(p.captions.length, 12, "captions");
  equal(p.commentary.length, 14, "commentary lines");
  equal(p.events.length, 20, "events");
  equal(p.lessons.length, 5, "lessons");
  equal(p.analysis.length, 5, "analysis paragraphs");
  equal(p.lessons[0].text, "lesson 0", "a lesson written as a plain string");
});

test("a clip's address comes from its title", () => {
  equal(normalizePlay(basePlay()).id, "a-worked-move", "the title");
  equal(normalizePlay(playWith({ title: "Messi's solo goal" })).id, "messis-solo-goal", "an apostrophe");
  equal(slugify("Di María in the Lusail final"), "di-maria-in-the-lusail-final", "an accent");
  equal(normalizePlay(playWith({ id: "1970-carlos-alberto", title: "Whatever" })).id, "1970-carlos-alberto", "an id of its own");
  equal(normalizePlay(playWith({ title: "" })).title, "Untitled play", "a play with no title at all");
});

test("text is trimmed to what there is room for rather than overflowing the page", () => {
  const p = normalizePlay(playWith({
    title: "T".repeat(200),
    note: "N".repeat(900),
    captions: [{ t: 1, text: "C".repeat(300) }],
    commentary: [{ t: 1, text: "M".repeat(300) }],
    lessons: [{ label: "L".repeat(80), text: "X".repeat(900) }]
  }));
  equal(p.title.length, 60, "title");
  equal(p.note.length, 400, "note");
  equal(p.captions[0].text.length, 100, "caption");
  equal(p.commentary[0].text.length, 110, "commentary line");
  equal(p.lessons[0].label.length, 28, "lesson label");
  equal(p.lessons[0].text.length, 240, "lesson text");
});

test("footage is only embedded when it is really a YouTube id", () => {
  equal(normalizePlay(playWith({ footage: { youtube: "dQw4w9WgXcQ", start: 12 } })).footage.id, "dQw4w9WgXcQ", "a real id");
  equal(normalizePlay(playWith({ footage: { youtube: "https://youtu.be/dQw4w9WgXcQ" } })).footage, null, "a whole link");
  equal(normalizePlay(playWith({ footage: { youtube: "\" onerror=alert(1)" } })).footage, null, "something that is not an id");
  close(normalizePlay(playWith({ footage: { youtube: "dQw4w9WgXcQ", start: -5 } })).footage.start, 0, 0, "a negative start time");
});
