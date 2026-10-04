// Checks that bodies travel like bodies: nobody moves faster than a person can run, and nobody
// changes speed faster than a person can push off the ground. A path that breaks either rule reads
// as a piece sliding across a board rather than someone running.
// Usage: node tools/check_glide.js [library/plays/*.json]   (no arguments = every clip)
"use strict";
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "birdseye.html"), "utf8");
const js = html.slice(html.indexOf("<script>\n(() => {") + "<script>".length, html.lastIndexOf("</script>"));
const between = (a, b) => {
  const i = js.indexOf(a), j = js.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error(`marker missing in birdseye.html: ${a}`);
  return js.slice(i, j);
};
const api = new Function(
  // From the pitch geometry rather than from the plays, so the harness has the same constants
  // the renderer does (the goal mouth among them) instead of redeclaring a couple by hand
  between("  // ---------- Pitch geometry (metres) ----------", "  // ---------- Rendering ----------") +
  between("  const yearOf = play =>", "  function renderLibrary()") +
  "\nreturn { normalizePlay, compile, pathPos };"
)();

const STEP = 0.05;
const TOP = 9.6;    // metres per second: a fast footballer flat out
const ACC = 8.0;    // metres per second per second, sprinting off the mark or stopping hard

function measure(play) {
  const R = api.compile(play);
  const out = { frames: 0, fast: 0, hard: 0, topSpeed: 0, topAcc: 0, who: [] };
  for (const pl of play.players) {
    let prev = null, prevV = null, worst = { v: 0, a: 0, t: 0, at: 0 };
    // A path simply stops at its last key, and the body stands still from then on. That stop is the
    // clip ending, not a body doing something impossible, so the last moments are not judged.
    const ends = R.byId[pl.id].path[R.byId[pl.id].path.length - 1][0] - 2 * STEP;
    for (let t = 0; t <= Math.min(play.duration, ends) + 1e-9; t += STEP) {
      const p = api.pathPos(R.byId[pl.id].path, t);
      if (prev) {
        const v = { x: (p.x - prev.x) / STEP, y: (p.y - prev.y) / STEP };
        const speed = Math.hypot(v.x, v.y);
        out.frames++;
        if (speed > TOP) out.fast++;
        if (speed > worst.v) { worst.v = speed; worst.t = t; }
        if (prevV) {
          const a = Math.hypot(v.x - prevV.x, v.y - prevV.y) / STEP;
          if (a > ACC) out.hard++;
          if (a > worst.a) { worst.a = a; worst.at = t; }
        }
        prevV = v;
      }
      prev = p;
    }
    out.topSpeed = Math.max(out.topSpeed, worst.v);
    out.topAcc = Math.max(out.topAcc, worst.a);
    if (worst.v > TOP || worst.a > ACC) {
      out.who.push(`${pl.id}  top ${worst.v.toFixed(1)} m/s @${worst.t.toFixed(2)}s  ·  peak ${worst.a.toFixed(0)} m/s2 @${worst.at.toFixed(2)}s`);
    }
  }
  return out;
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(path.join(__dirname, "..", "library", "plays")).map(f => path.join("library", "plays", f));

let bad = 0;
for (const f of files) {
  const play = api.normalizePlay(JSON.parse(fs.readFileSync(f, "utf8")));
  const m = measure(play);
  const fail = m.fast / m.frames > 0.002 || m.hard / m.frames > 0.01;
  if (fail) bad++;
  console.log(`${fail ? "FAIL" : "ok  "}  ${path.basename(f).padEnd(34)} ` +
    `top ${m.topSpeed.toFixed(1)} m/s · peak ${m.topAcc.toFixed(0)} m/s2 · ` +
    `too fast ${((m.fast / m.frames) * 100).toFixed(1)}% · too hard ${((m.hard / m.frames) * 100).toFixed(1)}%`);
  m.who.slice(0, 3).forEach(w => console.log(`         ${w}`));
}
process.exit(bad ? 1 : 0);
