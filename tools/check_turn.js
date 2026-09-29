// Checks that bodies turn like bodies: no faster than a person can swing their shoulders round, and
// without flicking back and forth between two directions. A body that snaps between facing the ball
// and facing its run is the tell of a rule switching, not of someone changing their mind.
// Usage: node tools/check_turn.js [library/plays/*.json]   (no arguments = every clip)
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
  "const W = 105, H = 68;\n" +
  between("  // ---------- Built-in plays ----------", "  // ---------- Rendering ----------") +
  between("  const yearOf = play =>", "  function renderLibrary()") +
  "\nreturn { normalizePlay, compile, pathPos };"
)();

const WRAP = a => Math.atan2(Math.sin(a), Math.cos(a));
const STEP = 0.05;
// A body stood up can pivot briskly; a body at a sprint cannot — its legs are committed. So the
// limit is read against how fast the player is actually travelling.
const PIVOT = 5.5;     // radians per second: more than anyone turns, at any speed
const RUNNING = 5.0;   // metres per second, past which the shoulders can only come round slowly
const ON_THE_RUN = 3.0;
const FLICK = 1.8;     // radians per second either side of a reversal before it reads as a flick

function measure(play) {
  const R = api.compile(play);
  const out = { frames: 0, fast: 0, flicks: 0, peak: 0, at: "", flickAt: "" };
  for (const pl of play.players) {
    let prev = null, prevRate = null;
    for (let t = 0; t <= play.duration + 1e-9; t += STEP) {
      const b = R.bodyAt(pl, t);
      if (b.action) { prev = null; prevRate = null; continue; }   // a dive throws the body about on purpose
      if (prev != null) {
        const rate = WRAP(b.heading - prev) / STEP;
        out.frames++;
        const speed = b.gait.speed;
        if (Math.abs(rate) > PIVOT || (speed > RUNNING && Math.abs(rate) > ON_THE_RUN)) out.fast++;
        if (Math.abs(rate) > out.peak) { out.peak = Math.abs(rate); out.at = `${pl.id} @${t.toFixed(2)}s`; }
        // Turning one way and then straight back the other is a rule changing its mind, not a player
        if (prevRate != null && Math.sign(rate) !== Math.sign(prevRate) &&
            Math.abs(rate) > FLICK && Math.abs(prevRate) > FLICK) {
          out.flicks++;
          if (!out.flickAt) out.flickAt = `${pl.id} @${t.toFixed(2)}s`;
        }
        prevRate = rate;
      }
      prev = b.heading;
    }
  }
  return out;
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(path.join(__dirname, "..", "library", "plays")).map(f => path.join("library", "plays", f));

let bad = 0, tf = 0, tfast = 0, tflick = 0;
for (const f of files) {
  const play = api.normalizePlay(JSON.parse(fs.readFileSync(f, "utf8")));
  const m = measure(play);
  tf += m.frames; tfast += m.fast; tflick += m.flicks;
  const fail = m.fast / m.frames > 0.02 || m.flicks / m.frames > 0.005;
  if (fail) bad++;
  console.log(`${fail ? "FAIL" : "ok  "}  ${path.basename(f).padEnd(34)} ` +
    `turning too fast ${((m.fast / m.frames) * 100).toFixed(1).padStart(5)}% (peak ${m.peak.toFixed(1)} rad/s ${m.at}) · ` +
    `flicks ${((m.flicks / m.frames) * 100).toFixed(2).padStart(5)}% ${m.flickAt}`);
}
console.log(`\noverall: ${((tfast / tf) * 100).toFixed(1)}% of frames turn faster than a person can, ` +
  `${((tflick / tf) * 100).toFixed(2)}% snap back the other way`);
process.exit(bad ? 1 : 0);
