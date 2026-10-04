// Checks the ball against the bodies it passes: a pass or a shot should not travel through a
// player who is standing in its way, and a ball on the ground should not sit inside someone.
// Usage: node tools/check_ball.js [library/plays/*.json]   (no arguments = every clip)
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

const STEP = 0.02;          // the ball moves fast: look at it every fiftieth of a second
const BODY = 0.55;          // how close counts as going through someone, in metres

function measure(play) {
  const R = api.compile(play);
  const carrying = new Set();
  const hits = [];
  let flightFrames = 0;
  for (let t = 0; t <= play.duration + 1e-9; t += STEP) {
    const ball = R.ballAt(t);
    if (ball.carried || ball.h > 1.2) continue;            // at someone's feet, or over their heads
    // Who has just played it or is about to receive it: the ball belongs near them
    carrying.clear();
    for (const k of play.ball) {
      if (k.with && Math.abs(k.t - t) < 0.5) carrying.add(k.with);
    }
    flightFrames++;
    for (const pl of play.players) {
      if (carrying.has(pl.id)) continue;
      const p = api.pathPos(R.byId[pl.id].path, t);
      const d = Math.hypot(p.x - ball.x, p.y - ball.y);
      if (d < BODY) hits.push({ t, id: pl.id, d });
    }
  }
  // Group neighbouring frames: one pass through one body is one fault, not fifty
  const faults = [];
  for (const hit of hits) {
    const last = faults[faults.length - 1];
    if (last && last.id === hit.id && hit.t - last.until < 0.2) {
      last.until = hit.t;
      last.closest = Math.min(last.closest, hit.d);
    } else {
      faults.push({ id: hit.id, at: hit.t, until: hit.t, closest: hit.d });
    }
  }
  return { faults, flightFrames };
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(path.join(__dirname, "..", "library", "plays")).map(f => path.join("library", "plays", f));

let bad = 0;
for (const f of files) {
  const play = api.normalizePlay(JSON.parse(fs.readFileSync(f, "utf8")));
  const { faults } = measure(play);
  if (faults.length) bad++;
  console.log(`${faults.length ? "FAIL" : "ok  "}  ${path.basename(f).padEnd(34)} ${faults.length} through a body`);
  faults.slice(0, 4).forEach(x =>
    console.log(`         ${x.id} at ${x.at.toFixed(2)}s, within ${x.closest.toFixed(2)} m`));
}
process.exit(bad ? 1 : 0);
