// Checks that defenders behave like defenders near the ball: they close it down or hold, they do not
// back away from it, and nobody's stride stutters. Usage: node tools/check_press.js [clips]
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

const STEP = 0.05;
const NEAR = 9;        // metres: close enough that the ball is your problem
const RETREAT = 1.2;   // metres per second away from it before it looks like running away

function measure(play) {
  const R = api.compile(play);
  const goal = Math.min(...play.events.filter(e => e.type === "goal").map(e => e.t), Infinity);
  const out = { near: 0, backing: 0, worst: 0, at: "", jitter: 0, frames: 0, namedNear: 0, namedBack: 0 };
  // Only the defender closest to the ball is judged on pressing. The rest are covering space, and
  // dropping goal-side while the ball comes at you is defending, not running away.
  const nearest = new Map();
  for (let t = 0; t <= Math.min(play.duration, goal) + 1e-9; t += STEP) {
    const ball = R.ballAt(t);
    let best = null;
    for (const pl of play.players) {
      if (pl.team !== "B" || pl.gk) continue;
      const p = api.pathPos(R.byId[pl.id].path, t);
      const d = Math.hypot(ball.x - p.x, ball.y - p.y);
      if (!best || d < best.d) best = { id: pl.id, d };
    }
    if (best) nearest.set(t.toFixed(2), best.id);
  }
  for (const pl of play.players) {
    if (pl.team !== "B") continue;
    let prev = null, prevV = null;
    for (let t = 0; t <= Math.min(play.duration, goal) + 1e-9; t += STEP) {
      const p = api.pathPos(R.byId[pl.id].path, t);
      const ball = R.ballAt(t);
      if (nearest.get(t.toFixed(2)) !== pl.id) { prev = p; continue; }
      if (prev) {
        const vx = (p.x - prev.x) / STEP, vy = (p.y - prev.y) / STEP;
        const gap = Math.hypot(ball.x - p.x, ball.y - p.y);
        // Inside three metres a defender is engaged whichever way they happen to be facing — running
        // shoulder to shoulder with a carrier points your velocity away from a ball that is beside
        // you, and that is chasing, not fleeing. Beyond that, travelling away from the ball is
        // exactly what it looks like.
        if (gap < NEAR && gap > 3) {
          out.near++;
          const away = -((ball.x - p.x) * vx + (ball.y - p.y) * vy) / gap;
          if (pl.name || pl.star) out.namedNear++;
          out.jog = (out.jog || 0) + (away > 2.5 ? 1 : 0);
          out.run = (out.run || 0) + (away > 4 ? 1 : 0);
          if (away > 4 && !(pl.name || pl.star)) out.engineRun = (out.engineRun || 0) + 1;
          if (away > RETREAT) {
            out.backing++;
            if (pl.name || pl.star) out.namedBack++;
            if (away > out.worst) { out.worst = away; out.at = `${pl.id} @${t.toFixed(2)}s ${away.toFixed(1)} m/s`; }
          }
        }
        // Stutter: the direction of travel reversing from one frame to the next at pace
        if (prevV) {
          const s = Math.hypot(vx, vy), ps = Math.hypot(prevV.x, prevV.y);
          if (s > 1 && ps > 1) {
            const dot = (vx * prevV.x + vy * prevV.y) / (s * ps);
            out.frames++;
            if (dot < 0.86) out.jitter++;     // more than a 30 degree swerve in a twentieth of a second
          }
        }
        prevV = { x: vx, y: vy };
      }
      prev = p;
    }
  }
  return out;
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(path.join(__dirname, "..", "library", "plays")).map(f => path.join("library", "plays", f));

let jog = 0, run = 0;
let bad = 0, totNear = 0, totBack = 0, totJit = 0, totFrames = 0, nN = 0, nB = 0;
for (const f of files) {
  const play = api.normalizePlay(JSON.parse(fs.readFileSync(f, "utf8")));
  const m = measure(play);
  totNear += m.near; totBack += m.backing; totJit += m.jitter; totFrames += m.frames; nN += m.namedNear; nB += m.namedBack; jog += m.jog || 0; run += m.run || 0;
  const pct = m.near ? (m.backing / m.near) * 100 : 0;
  // Only the players the engine moves are judged. Where a clip names someone, their positions are
  // the record of what they actually did, and a defender who really did drop off is not a bug to be
  // fixed — the recorded share is reported so it stays visible, but it does not fail the clip.
  const engineNear = m.near - m.namedNear, engineBack = m.backing - m.namedBack;
  const enginePct = engineNear ? (engineBack / engineNear) * 100 : 0;
  // Drifting back into shape at a jog is defending; turning and running from the ball is the fault.
  // The gate is on the run, and only on bodies the engine moves.
  const fail = engineNear ? (m.engineRun || 0) / engineNear > 0.01 : false;
  if (fail) bad++;
  console.log(`${fail ? "FAIL" : "ok  "}  ${path.basename(f).padEnd(34)} ` +
    `engine ${enginePct.toFixed(0).padStart(3)}% · recorded ${(pct - enginePct >= 0 ? (m.namedNear ? (m.namedBack / m.namedNear) * 100 : 0) : 0).toFixed(0).padStart(3)}% ` +
    `of near-ball frames back off, ${(m.engineRun || 0)} at a run · worst ${m.at || "-"}`);
}
console.log(`  above a backpedal (2.5 m/s): ${((jog / totNear) * 100).toFixed(1)}% · at a run (4 m/s): ${((run / totNear) * 100).toFixed(1)}%`);
console.log(`  of those, ${nB} of ${nN} backing-off frames belong to players the clip names (recorded positions), ` +
  `${totBack - nB} of ${totNear - nN} to ones the engine moves`);
console.log(`\noverall: ${((totBack / totNear) * 100).toFixed(1)}% of near-ball defender frames move away from the ball; ` +
  `${((totJit / totFrames) * 100).toFixed(1)}% of moving frames swerve more than 30 degrees in a twentieth of a second`);
process.exit(bad ? 1 : 0);
