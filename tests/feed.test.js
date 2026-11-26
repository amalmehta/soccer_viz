// The live play-by-play: the feed under the controls that fills in as the clip runs. It is built
// from the play's own captions, events and actions, so every clip and every generated play gets
// one with no new data — which also means the rules for what earns a line, and what merely badges
// a line already there, are the whole of it.
"use strict";
const { normalizePlay, compile } = require("./app");
const { basePlay, playWith } = require("./fixtures");
const { test, ok, equal, same } = require("./harness");

const feedOf = raw => compile(normalizePlay(raw)).moments;
const tagged = (rows, tag) => rows.filter(r => r.tag === tag);

test("the captions are the spine of the feed, in the order they happen", () => {
  const rows = feedOf(basePlay());
  for (const caption of basePlay().captions) {
    ok(rows.some(r => r.text === caption.text), `the caption ${JSON.stringify(caption.text)} is in the feed`);
  }
  const times = rows.map(r => r.t);
  same(times, times.slice().sort((a, b) => a - b), "the feed is in time order");
});

test("a goal badges the moment it was struck instead of repeating it", () => {
  // The goal is timed as the ball crosses the line, a beat after the shot that put it there. Two
  // lines for one moment reads as a stutter, so the strike's own line becomes the goal.
  const rows = feedOf(playWith({
    actions: [{ t: 4.6, id: "striker", type: "volley" }],
    events: [{ t: 4.6, type: "shot", team: "A" }, { t: 4.9, type: "goal", team: "A" }]
  }));
  equal(tagged(rows, "Goal").length, 1, "goal lines");
  equal(tagged(rows, "Volley").length, 0, "the volley's own line, now that it is the goal");
  const goal = tagged(rows, "Goal")[0];
  ok(/volley/i.test(goal.text), `the line still says what happened: ${JSON.stringify(goal.text)}`);
  ok(/m\/s/.test(goal.metric || ""), `and how it was struck: ${JSON.stringify(goal.metric)}`);
});

test("a goal with nothing else on that moment gets a line of its own", () => {
  const rows = feedOf(playWith({ actions: [], events: [{ t: 5.2, type: "goal", team: "A" }] }));
  const goal = tagged(rows, "Goal");
  equal(goal.length, 1, "goal lines");
  ok(/Goal for Reds/.test(goal[0].text), `the line names the team: ${JSON.stringify(goal[0].text)}`);
});

test("the skills worth watching are badged and the everyday ones are not", () => {
  const rows = feedOf(playWith({
    events: [],
    actions: [
      { t: 1, id: "striker", type: "kick" },
      { t: 1.5, id: "stopper", type: "lunge" },
      { t: 2, id: "winger", type: "header" },
      { t: 3, id: "stopper", type: "slide" },
      { t: 4, id: "keeper", type: "dive" }
    ]
  }));
  same(rows.filter(r => r.key).map(r => r.tag), ["Header", "Tackle", "Dive"], "the badges, in order");
  ok(rows.find(r => r.tag === "Header").text.startsWith("Winger"), "the line says who did it");
  ok(rows.find(r => r.tag === "Dive").text.includes("dives"), "and what they did");
});

test("a pass earns a line when it was worth watching, not because it was a pass", () => {
  const short = feedOf(playWith({
    captions: [],
    actions: [],
    ball: [{ t: 0, with: "striker" }, { t: 1, with: "striker" }, { t: 1.6, x: 66, y: 38 }],
    events: [{ t: 1, type: "pass", team: "A" }]
  }));
  equal(tagged(short, "Pass").length, 0, "lines for a ball rolled a few metres sideways");

  const struck = feedOf(playWith({
    captions: [],
    actions: [],
    ball: [{ t: 0, with: "striker" }, { t: 1, with: "striker" }, { t: 2.2, x: 96, y: 50, power: 1, curve: 0.6 }],
    events: [{ t: 1, type: "pass", team: "A" }]
  }));
  equal(tagged(struck, "Pass").length, 1, "lines for a ball hit forty metres with bend on it");
  const pass = tagged(struck, "Pass")[0];
  ok(/^Striker: /.test(pass.text), `the line names the striker: ${JSON.stringify(pass.text)}`);
  ok(/curled right/.test(pass.metric), `and reads the spin off it: ${JSON.stringify(pass.metric)}`);
});

test("a player with no name is called something a viewer can follow", () => {
  const rows = feedOf(playWith({
    captions: [],
    events: [],
    players: basePlay().players.map(p => (p.id === "winger" ? { ...p, name: undefined } : p)),
    actions: [{ t: 2, id: "winger", type: "header" }]
  })).filter(r => !r.said);  // the commentary's own lines are not what this is about
  equal(rows.length, 1, "lines");
  ok(rows[0].text.startsWith("RED 7"), `the shirt stands in for the name: ${JSON.stringify(rows[0].text)}`);
});

