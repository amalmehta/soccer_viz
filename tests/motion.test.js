// How a body gets from one keyframe to the next. A play is a handful of positions with times on
// them; everything the eye reads as football — pace, a turn, a stride — is worked out from them by
// pathPos and compile(). The checkers in tools/ measure the finished clips; these tests hold the
// rules themselves, on a play small enough that a failure says which rule broke.
"use strict";
const { normalizePlay, compile, pathPos, TOP_SPEED } = require("./app");
const { basePlay, playWith } = require("./fixtures");
const { test, ok, equal, close, within, fail } = require("./harness");

const STEP = 0.05;
const WRAP = a => Math.atan2(Math.sin(a), Math.cos(a));
const TURN_CAP = 7.5;    // radians per second: as fast as shoulders come round

test("a path goes through the positions it was given", () => {
  const path = [[0, 20, 30], [1.5, 28, 33], [3, 40, 30], [5, 52, 40]];
  for (const [t, x, y] of path) {
    const p = pathPos(path, t);
    close(p.x, x, 1e-9, `x at ${t}s`);
    close(p.y, y, 1e-9, `y at ${t}s`);
  }
});

test("before a path starts and after it ends the body stands still", () => {
  const path = [[0, 20, 30], [2, 40, 30]];
  for (const t of [-5, -0.1, 0]) close(pathPos(path, t).x, 20, 1e-9, `x at ${t}s`);
  for (const t of [2, 2.1, 90]) close(pathPos(path, t).x, 40, 1e-9, `x at ${t}s`);
});

test("the curve between keyframes never flings a body past a sprint", () => {
  // Keyframes a long way apart in space and close in time are where a spline overshoots: the curve
  // leaving one key and arriving at the next can bow out well beyond either. The tangent at each
  // key is held to a sprint for exactly this reason.
  const path = [[0, 20, 34], [1, 24, 34], [2, 26, 38], [3, 30, 36], [4, 30, 40], [5, 34, 34]];
  let straight = 0;
  for (let i = 1; i < path.length; i++) {
    straight = Math.max(straight, Math.hypot(path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]) / (path[i][0] - path[i - 1][0]));
  }
  let top = 0, at = 0;
  for (let t = 0; t <= 5; t += 0.005) {
    const a = pathPos(path, t), b = pathPos(path, t + 0.005);
    const v = Math.hypot(b.x - a.x, b.y - a.y) / 0.005;
    if (v > top) { top = v; at = t; }
  }
  ok(top <= TOP_SPEED, `top speed along the curve was ${top.toFixed(1)} m/s at ${at.toFixed(2)}s`);
  ok(top <= straight * 1.4, `the curve ran at ${top.toFixed(1)} m/s where the keyframes asked for ${straight.toFixed(1)} m/s`);
});

test("a body never exceeds a human top speed or a human change of pace", () => {
  const play = normalizePlay(basePlay());
  const R = compile(play);
  for (const pl of play.players) {
    const path = R.byId[pl.id].path;
    const ends = path[path.length - 1][0] - 2 * STEP;
    let prev = null, prevV = null;
    for (let t = 0; t <= Math.min(play.duration, ends) + 1e-9; t += STEP) {
      const p = pathPos(path, t);
      if (prev) {
        const v = { x: (p.x - prev.x) / STEP, y: (p.y - prev.y) / STEP };
        const speed = Math.hypot(v.x, v.y);
        if (speed > TOP_SPEED) fail(`${pl.id} reached ${speed.toFixed(1)} m/s at ${t.toFixed(2)}s`);
        if (prevV) {
          const acc = Math.hypot(v.x - prevV.x, v.y - prevV.y) / STEP;
          if (acc > 8.0) fail(`${pl.id} changed pace at ${acc.toFixed(1)} m/s² at ${t.toFixed(2)}s`);
        }
        prevV = v;
      }
      prev = p;
    }
  }
});

test("bodies turn at a human rate rather than snapping round", () => {
  const play = normalizePlay(basePlay());
  const R = compile(play);
  for (const pl of play.players) {
    let prev = null;
    for (let t = 0; t <= play.duration + 1e-9; t += STEP) {
      const b = R.bodyAt(pl, t);
      ok(Number.isFinite(b.heading), `${pl.id} has a heading at ${t.toFixed(2)}s`);
      if (prev != null && !b.action) {
        const spin = Math.abs(WRAP(b.heading - prev)) / STEP;
        if (spin > TURN_CAP + 0.5) fail(`${pl.id} turned at ${spin.toFixed(1)} rad/s at ${t.toFixed(2)}s`);
      }
      prev = b.heading;
    }
  }
});

test("the stride follows the speed, so feet never slide", () => {
  // The run cycle is driven by ground covered, not by a clock: a body moving at walking pace that
  // keeps a sprinter's stride is the gliding look, and it is what this holds shut.
  const play = normalizePlay(basePlay());
  const R = compile(play);
  for (const pl of play.players) {
    let prev = null;
    for (let t = 0; t <= play.duration + 1e-9; t += STEP) {
      const b = R.bodyAt(pl, t);
      if (prev && !b.action) {
        const speed = Math.hypot(b.x - prev.x, b.y - prev.y) / STEP;
        if (speed < 0.3 && b.gait.run > 0.15) fail(`${pl.id} is standing still at ${t.toFixed(2)}s with a stride of ${b.gait.run.toFixed(2)}`);
        if (speed > 6 && b.gait.run < 0.5) fail(`${pl.id} is running at ${speed.toFixed(1)} m/s at ${t.toFixed(2)}s with a stride of ${b.gait.run.toFixed(2)}`);
      }
      prev = b;
    }
  }
});

test("a player the clip has stopped recording is handed to the engine, not left standing", () => {
  // Half of all body-time is the engine's reconstruction rather than anything recorded, and the
  // drawing says which is which. A clip that writes a player's position twice and never again is
  // not a record of someone standing still for six seconds: it is the end of the record.
  const play = normalizePlay(playWith({
    players: [
      ...basePlay().players,
      { id: "forgotten", team: "B", path: [[0, 70, 20], [6, 70, 20]] }
    ]
  }));
  const R = compile(play);
  const forgotten = play.players.find(p => p.id === "forgotten");
  equal(R.recordedUntil.get("forgotten"), 0, "how much of this player the clip can vouch for");
  const end = R.bodyAt(forgotten, play.duration - 0.1);
  ok(Math.hypot(end.x - 70, end.y - 20) > 1, `the engine moved the player (they ended ${Math.hypot(end.x - 70, end.y - 20).toFixed(1)} m from the spot)`);
  // A named player the clip really does follow keeps their own path to the end of it
  const striker = play.players.find(p => p.id === "striker");
  equal(R.recordedUntil.get("striker"), 6, "a player the clip follows all the way");
  const atEnd = R.bodyAt(striker, 6);
  ok(Math.hypot(atEnd.x - 90, atEnd.y - 34) < 2, "the striker finishes where the clip says");
});

test("compiling the same play twice gives the same movement", () => {
  // compile() builds a gait table per player and then reads positions back off it while it is
  // still being written. Anything cached by index alone goes stale the moment the table moves,
  // and the symptom is a clip that animates differently the second time it is opened.
  const play = normalizePlay(basePlay());
  const sample = () => {
    const R = compile(play);
    const out = [];
    for (const pl of play.players) {
      for (let t = 0; t <= play.duration + 1e-9; t += 0.1) {
        const b = R.bodyAt(pl, t);
        const foot = R.footAt(pl, t, 0);
        out.push([b.x, b.y, b.heading, b.gait.run, b.gait.phase, foot.x, foot.y]);
      }
    }
    return out;
  };
  const first = sample(), second = sample();
  equal(second.length, first.length, "frames sampled");
  for (let i = 0; i < first.length; i++) {
    for (let k = 0; k < first[i].length; k++) {
      if (first[i][k] !== second[i][k]) fail(`frame ${i} differs on the second compile: ${first[i][k]} then ${second[i][k]}`);
    }
  }
});

test("every body stays on the pitch and has somewhere to put its feet", () => {
  const play = normalizePlay(basePlay());
  const R = compile(play);
  for (const pl of play.players) {
    for (let t = 0; t <= play.duration + 1e-9; t += 0.1) {
      const b = R.bodyAt(pl, t);
      within(b.x, -4, 109, `${pl.id} x at ${t.toFixed(1)}s`);
      within(b.y, -4, 72, `${pl.id} y at ${t.toFixed(1)}s`);
      for (const leg of [0, 1]) {
        const foot = R.footAt(pl, t, leg);
        ok(foot && Number.isFinite(foot.x) && Number.isFinite(foot.y), `${pl.id} has leg ${leg} on the ground at ${t.toFixed(1)}s`);
      }
    }
  }
});
