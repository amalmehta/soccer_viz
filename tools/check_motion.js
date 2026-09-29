// Checks how bodies move: that a player faces roughly where they are going (or is plainly
// backpedalling), that nobody spins on the spot, and that the run cycle matches the speed.
// Usage: node tools/check_motion.js library/plays/*.json     (no arguments = every clip)
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

function measure(play) {
  const R = api.compile(play);
  const out = {
    frames: 0, gliding: 0, spinning: 0, worstSpin: 0, worstSpinAt: null,
    backpedalFast: 0, worstBackpedal: 0, examples: []
  };
  for (const pl of play.players) {
    let prev = null, prevHeading = null;
    for (let t = 0; t <= play.duration + 1e-9; t += STEP) {
      const b = R.bodyAt(pl, t);
      const here = { x: b.x, y: b.y };
      const posing = !!b.action;   // a dive or a lunge is meant to throw the body about
      if (prev && !posing) {
        const dx = here.x - prev.x, dy = here.y - prev.y;
        const speed = Math.hypot(dx, dy) / STEP;
        const spin = Math.abs(WRAP(b.heading - prevHeading)) / STEP;
        out.frames++;
        if (spin > out.worstSpin) { out.worstSpin = spin; out.worstSpinAt = `${pl.id} @${t.toFixed(1)}s`; }
        if (spin > 12) out.spinning++;                       // a body cannot turn this fast
        if (speed > 1.5) {
          const off = Math.abs(WRAP(Math.atan2(dy, dx) - b.heading));
          // Travelling backwards is fine at a backpedal; at a sprint it reads as gliding
          if (off > 2.0) {
            if (speed > 4) {
              out.backpedalFast++;
              if (speed > out.worstBackpedal) out.worstBackpedal = speed;
              if (out.examples.length < 4) out.examples.push(`${pl.id} @${t.toFixed(1)}s ${speed.toFixed(1)} m/s backwards`);
            }
          } else if (off > 1.2 && b.gait.run > 0.55) {
            out.gliding++;                                   // running hard but side-on
          }
        }
      }
      prev = posing ? null : here;   // the frame after a dive is not a running frame either
      prevHeading = b.heading;
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
  const pct = n => ((n / m.frames) * 100).toFixed(1) + "%";
  const fail = m.backpedalFast / m.frames > 0.004 || m.spinning / m.frames > 0.002;
  if (fail) bad++;
  console.log(`${fail ? "FAIL" : "ok  "}  ${path.basename(f).padEnd(34)} ` +
    `sprinting backwards ${pct(m.backpedalFast).padStart(6)} (max ${m.worstBackpedal.toFixed(1)} m/s) · ` +
    `side-on runs ${pct(m.gliding).padStart(6)} · spins ${pct(m.spinning).padStart(6)} (max ${m.worstSpin.toFixed(0)} rad/s ${m.worstSpinAt || ""})`);
  m.examples.forEach(e => console.log(`         ${e}`));
}
process.exit(bad ? 1 : 0);
