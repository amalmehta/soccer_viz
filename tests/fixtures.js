// A play small enough to read in one go, so a test can say exactly what it is changing. Everything
// not named here is what the validator fills in for a play that leaves it out.
"use strict";

const basePlay = () => ({
  title: "A worked move",
  duration: 6,
  teams: {
    A: { name: "Reds", short: "RED", color: "#c23b22", color2: "#7a2516", text: "#ffffff", pattern: "plain", shorts: "#ffffff", socks: "#c23b22", gkColor: "#34c77b" },
    B: { name: "Blues", short: "BLU", color: "#2a4b8d", color2: "#16294f", text: "#ffffff", pattern: "stripes", shorts: "#ffffff", socks: "#2a4b8d", gkColor: "#f2c94c" }
  },
  score: [0, 0],
  players: [
    { id: "striker", team: "A", num: 9, name: "Striker", star: true, path: [[0, 60, 34], [2, 70, 34], [4, 82, 34], [6, 90, 34]] },
    { id: "winger", team: "A", num: 7, name: "Winger", path: [[0, 58, 52], [2, 68, 50], [4, 80, 46], [6, 88, 42]] },
    { id: "stopper", team: "B", num: 5, name: "Stopper", path: [[0, 86, 36], [2, 84, 35], [4, 86, 35], [6, 92, 35]] },
    { id: "keeper", team: "B", num: 1, name: "Keeper", gk: true, path: [[0, 103, 34], [3, 102, 34], [6, 101, 34]] }
  ],
  ball: [
    { t: 0, with: "striker" },
    { t: 2, with: "striker" },
    { t: 2.2, x: 72, y: 46, power: 0.5 },
    { t: 3, with: "winger" },
    { t: 4.6, x: 96, y: 36, power: 0.9 },
    { t: 5.2, x: 105.5, y: 35 }
  ],
  captions: [{ t: 0, text: "Reds break" }, { t: 4.6, text: "And it is in" }],
  commentary: [{ t: 0.5, text: "Reds come forward." }],
  events: [{ t: 2.2, type: "pass", team: "A" }, { t: 4.6, type: "shot", team: "A" }, { t: 5.2, type: "goal", team: "A" }],
  actions: [{ t: 4.6, id: "striker", type: "kick" }],
  venue: { time: "night", roof: "partial", stands: "#1d232c", accent: "#3a4150", track: false, grass: "#2c7437", mowing: "stripes" },
  analysis: [{ label: "The move", text: "One pass and a run behind." }],
  lessons: [{ label: "Run early", text: "Start the run before the pass is played." }],
  note: "A made-up play, used by the tests."
});

// A play with the one change this test is about, written over the known-good one
const playWith = patch => Object.assign(basePlay(), patch);

module.exports = { basePlay, playWith };
