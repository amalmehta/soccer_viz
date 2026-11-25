// The ball. Two keyframes and a solved flight between them: it has to leave the foot that struck
// it, travel rather than jump, bend the way it was hit, slow down against the air and end up where
// the next keyframe says — including in the net. A ball that snaps sideways as it is struck is the
// most visible fault the app can have, and it is invisible in the data.
"use strict";
const { normalizePlay, compile, GOAL_Y0, GOAL_Y1, W } = require("./app");
const { basePlay, playWith } = require("./fixtures");
const { test, ok, equal, close, within, fail } = require("./harness");

const DT = 0.004;    // finer than any frame the screen will draw

const flight = (play, from, to, step = DT) => {
  const R = compile(play);
  const out = [];
  for (let t = from; t <= to + 1e-9; t += step) out.push({ t, ...R.ballAt(t) });
  return out;
};

test("the ball sits at the feet of whoever has it", () => {
  const play = normalizePlay(basePlay());
  const R = compile(play);
  const striker = play.players.find(p => p.id === "striker");
  for (let t = 0; t <= 1.8; t += 0.05) {
    const b = R.ballAt(t), body = R.bodyAt(striker, t);
    const gap = Math.hypot(b.x - body.x, b.y - body.y);
    within(gap, 0, 1.6, `how far the ball is from the player carrying it at ${t.toFixed(2)}s`);
  }
});

test("a struck ball travels rather than jumping to where it is needed", () => {
  // The two ends of a flight are a player's foot, and a foot moves as the stride does. Solve the
  // flight against one set of feet and draw it against another and the ball flies to the wrong
  // place, then snaps to the right one at the keyframe.
  const play = normalizePlay(basePlay());
  const path = flight(play, 0, play.duration);
  const steps = [];
  for (let i = 1; i < path.length; i++) {
    steps.push(Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y) / DT);
  }
  for (let i = 2; i < steps.length - 2; i++) {
    const around = Math.max(steps[i - 2], steps[i + 2], 3);
    if (steps[i] > around * 1.6) {
      fail(`the ball jumped at ${path[i].t.toFixed(2)}s: ${steps[i].toFixed(0)} m/s where it is doing ${around.toFixed(0)} m/s either side`);
    }
  }
});

test("a struck ball slows as it goes, the way a ball does", () => {
  const play = normalizePlay(playWith({
    ball: [{ t: 0, with: "striker" }, { t: 1, with: "striker" }, { t: 2.6, x: 100, y: 34, power: 1 }]
  }));
  const path = flight(play, 1.05, 2.55, 0.02);
  const half = Math.floor(path.length / 2);
  const run = (a, b) => Math.hypot(path[b].x - path[a].x, path[b].y - path[a].y);
  const early = run(0, half), late = run(half, path.length - 1);
  ok(early > late * 1.15, `the first half of the flight covered ${early.toFixed(1)} m and the second ${late.toFixed(1)} m`);
});

test("a ball hit with spin bends, and bends the way it was hit", () => {
  const sideOf = curve => {
    const play = normalizePlay(playWith({
      ball: [{ t: 0, with: "striker" }, { t: 1, with: "striker" }, { t: 2.4, x: 100, y: 34, power: 1, ...(curve ? { curve } : {}) }]
    }));
    const path = flight(play, 1.02, 2.38, 0.02);
    const a = path[0], b = path[path.length - 1];
    let worst = 0;
    for (const p of path) {
      // How far off the straight line between the two ends this point sits, and which side
      const off = ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / Math.hypot(b.x - a.x, b.y - a.y);
      if (Math.abs(off) > Math.abs(worst)) worst = off;
    }
    return worst;
  };
  close(sideOf(0), 0, 0.3, "a ball struck without spin");
  const right = sideOf(0.8), left = sideOf(-0.8);
  ok(Math.abs(right) > 1, `a ball hit with right-hand spin bent ${Math.abs(right).toFixed(1)} m off the straight line`);
  ok(Math.abs(left) > 1, `a ball hit with left-hand spin bent ${Math.abs(left).toFixed(1)} m off the straight line`);
  ok(Math.sign(right) === -Math.sign(left), "the two spins bend the ball to opposite sides");
});

test("a goal ends with the ball in the net, between the posts", () => {
  const play = normalizePlay(basePlay());
  const R = compile(play);
  const goal = play.events.find(e => e.type === "goal");
  ok(goal, "the play has a goal in it");
  const b = R.ballAt(goal.t);
  ok(b.x > W, `the ball is over the line (x = ${b.x.toFixed(1)} m)`);
  within(b.y, GOAL_Y0, GOAL_Y1, "where it crossed, against the goalposts");
});

test("a lofted ball leaves the ground and a ground pass does not", () => {
  const heights = lofted => {
    const play = normalizePlay(playWith({
      ball: [{ t: 0, with: "striker" }, { t: 1, with: "striker" }, { t: 2.4, x: 96, y: 44, power: 0.9, ...(lofted ? { lofted: true } : {}) }]
    }));
    return flight(play, 1.1, 2.3, 0.05).map(b => b.h);
  };
  ok(Math.max(...heights(true)) > 1.5, "a lofted ball gets up off the grass");
  close(Math.max(...heights(false)), 0, 0.4, "a ball played along the ground");
});

test("the ball is somewhere sensible at every moment of every library clip", () => {
  const { libraryFiles, readPlay } = require("./app");
  for (const file of libraryFiles) {
    const play = normalizePlay(readPlay(file));
    const R = compile(play);
    for (let t = 0; t <= play.duration + 1e-9; t += 0.05) {
      const b = R.ballAt(t);
      if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.h)) {
        fail(`${play.id}: the ball is nowhere at ${t.toFixed(2)}s`);
      }
      if (b.x < -4 || b.x > 112 || b.y < -4 || b.y > 74 || b.h < -0.01 || b.h > 30) {
        fail(`${play.id}: the ball is off the map at ${t.toFixed(2)}s (${b.x.toFixed(1)}, ${b.y.toFixed(1)}, ${b.h.toFixed(1)} m up)`);
      }
    }
  }
});
