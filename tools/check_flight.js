// Checks that the ball travels rather than jumps.
//
// Every pass and every shot is two keyframes with a solved trajectory between them, and the two
// ends of that trajectory are a player's foot — which moves as their stride does. If the flight is
// worked out against one set of feet and then drawn against another, the ball flies to the wrong
// place and snaps to the right one at the keyframe. It is invisible in the data and very visible
// on screen: a shot skips sideways as it is struck.
//
// So: sample finer than any frame the screen will draw, and look for a step across a keyframe that
// is far faster than the ball is genuinely moving either side of it.
// Usage: node tools/check_flight.js [library/plays/*.json]   (no arguments = every clip)
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
  between("  // ---------- Pitch geometry (metres) ----------", "  // ---------- Rendering ----------") +
  between("  const yearOf = play =>", "  function renderLibrary()") +
  "\nreturn { normalizePlay, compile };"
)();

const DT = 0.002;          // finer than a frame at any refresh rate
const MARGIN = 1.6, FLOOR = 3;   // how much faster than its surroundings counts as a jump

function jumps(play) {
  const R = api.compile(play);
  const out = [];
  for (const k of play.ball) {
    if (k.t <= 0 || k.t >= play.duration) continue;
    const speed = d => {
      const a = R.ballAt(k.t + d), b = R.ballAt(k.t + d + DT);
      return Math.hypot(b.x - a.x, b.y - a.y) / DT;
    };
    const across = speed(-DT / 2);                            // the step spanning the keyframe
    const near = Math.max(speed(-4 * DT), speed(2 * DT));     // honest ball speed either side
    if (across > near * MARGIN + FLOOR) out.push({ t: k.t, across, near });
  }
  return out;
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(path.join(__dirname, "..", "library", "plays")).map(f => path.join("library", "plays", f));

let bad = 0;
for (const f of files) {
  const play = api.normalizePlay(JSON.parse(fs.readFileSync(f, "utf8")));
  const found = jumps(play);
  if (found.length) bad++;
  console.log(`${found.length ? "FAIL" : "ok  "}  ${path.basename(f).padEnd(34)} ${found.length} jumped`);
  found.slice(0, 4).forEach(x =>
    console.log(`         at ${x.t.toFixed(2)}s: ${x.across.toFixed(0)} m/s across the join, ${x.near.toFixed(0)} m/s either side`));
}
process.exit(bad ? 1 : 0);
