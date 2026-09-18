// Checks Birdseye FC play files: the page's own validator (nothing may be silently dropped) plus
// realism checks on timing, speeds, goals, spacing, venue, analysis, wording and special actions.
// Usage: node tools/check_plays.js library/plays/*.json     or     node tools/check_plays.js --builtin
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
  between("  // ---------- Built-in plays ----------", "  // ---------- Validation") +
  between("  // ---------- Validation", "  // ---------- Motion ----------") +
  between("  function catmull(", "  function moveHeading(") +
  "\nreturn { normalizePlay, pathPos, MESSI_2011, GIVE_AND_GO, OVERLAP };"
)();

const HEX = /^#[0-9a-f]{6}$/i;
const PRONOUN = /\b(he|him|his|himself|she|her|hers|herself)\b/i;

function check(raw) {
  const errors = [], warns = [];
  let p;
  try {
    p = api.normalizePlay(raw);
  } catch (e) {
    return { errors: [`page validator rejected it: ${e.message}`], warns };
  }
  const len = a => (Array.isArray(a) ? a.length : 0);

  // Nothing silently dropped
  if (len(raw.players) !== p.players.length) errors.push(`players dropped by the page validator: ${len(raw.players)} -> ${p.players.length}`);
  if (len(raw.ball) !== p.ball.length) errors.push(`ball keyframes dropped: ${len(raw.ball)} -> ${p.ball.length}`);
  for (const k of ["captions", "commentary", "events", "actions"]) {
    if (len(raw[k]) !== p[k].length) errors.push(`${k} dropped: ${len(raw[k])} -> ${p[k].length}`);
  }
  for (const rp of Array.isArray(raw.players) ? raw.players : []) {
    const np = p.players.find(x => x.id === rp.id);
    if (!np) continue;
    if (len(rp.path) !== np.path.length) errors.push(`${rp.id}: path keyframes dropped ${len(rp.path)} -> ${np.path.length}`);
    for (const k of Object.keys(rp.look || {})) if (!(k in np.look)) errors.push(`${rp.id}: look.${k} = ${JSON.stringify(rp.look[k])} is not allowed`);
    for (const [t, x, y] of rp.path || []) {
      if (x < -2 || x > 107 || y < -2 || y > 70) errors.push(`${rp.id}: keyframe at ${t}s is off the pitch area (${x}, ${y})`);
      if (t > raw.duration) errors.push(`${rp.id}: keyframe at ${t}s is after the duration`);
    }
    if ((rp.path || [])[0] && rp.path[0][0] !== 0) errors.push(`${rp.id}: first keyframe must be at t=0`);
  }

  // Kits
  for (const tm of ["A", "B"]) {
    const team = (raw.teams || {})[tm] || {};
    for (const k of ["color", "color2", "text", "shorts", "socks", "gkColor"]) {
      if (!(typeof team[k] === "string" && HEX.test(team[k]))) errors.push(`teams.${tm}.${k} must be a #rrggbb colour`);
    }
    if (!["plain", "stripes", "hoops", "halves", "sash"].includes(team.pattern)) errors.push(`teams.${tm}.pattern must be plain/stripes/hoops/halves/sash`);
  }

  // Venue and analysis
  const vn = raw.venue;
  if (!vn || typeof vn !== "object") {
    errors.push("venue is missing");
  } else {
    if (!["day", "dusk", "night"].includes(vn.time)) errors.push("venue.time must be day/dusk/night");
    if (!["open", "partial", "closed"].includes(vn.roof)) errors.push("venue.roof must be open/partial/closed");
    for (const k of ["stands", "accent", "grass"]) if (!(typeof vn[k] === "string" && HEX.test(vn[k]))) errors.push(`venue.${k} must be a #rrggbb colour`);
    if (typeof vn.track !== "boolean") errors.push("venue.track must be true or false");
    if (!["stripes", "checks", "plain"].includes(vn.mowing)) errors.push("venue.mowing must be stripes/checks/plain");
  }
  const an = Array.isArray(raw.analysis) ? raw.analysis : [];
  if (an.length < 3 || an.length > 4) errors.push(`analysis needs 3-4 entries (has ${an.length})`);
  for (const a of an) {
    if (!a.label || a.label.length > 24) errors.push(`analysis label "${a.label}" must be 1-24 characters`);
    if (!a.text || a.text.length > 300) errors.push(`analysis "${a.label}" text must be 1-300 characters`);
  }

  // Wording: names or roles, not he/she
  for (const [k, list] of [["captions", raw.captions], ["commentary", raw.commentary], ["analysis", an]]) {
    for (const e of list || []) if (PRONOUN.test(e.text || "")) errors.push(`${k}: "${e.text}" uses he/she; use the player's name or role`);
  }
  if (PRONOUN.test(raw.note || "")) errors.push("note uses he/she; use names or roles");
  if ((raw.note || "").length > 400) errors.push(`note is ${raw.note.length} characters; keep it under 400`);

  // Special actions must line up with the ball
  for (const a of Array.isArray(raw.actions) ? raw.actions : []) {
    if (["volley", "bicycle", "header", "divingHeader", "chest"].includes(a.type) &&
        !(raw.ball || []).some(k => k.with === a.id && Math.abs(k.t - a.t) <= 0.25)) {
      errors.push(`action ${a.type} for ${a.id} at ${a.t}s needs a ball keyframe "with": "${a.id}" within 0.25 s`);
    }
    if (a.type === "dive" && a.side !== 1 && a.side !== -1) errors.push(`dive for ${a.id} at ${a.t}s needs "side": 1 or -1`);
  }

  // Basics
  if (typeof raw.duration !== "number" || raw.duration < 6 || raw.duration > 30) errors.push(`duration must be 6-30 s (is ${raw.duration})`);
  if (p.players.length < 10) warns.push(`only ${p.players.length} players`);
  const stars = p.players.filter(x => x.star).length;
  if (stars !== 1) errors.push(`exactly one star player needed (has ${stars})`);
  if (!p.players.some(x => x.gk)) warns.push("no goalkeeper flagged");
  for (const pl of p.players) if (pl.name && !Object.keys(pl.look).length) warns.push(`${pl.id} is named but has no look`);
  if (!p.note) warns.push("no accuracy note");
  if (p.commentary.length < 4) warns.push(`only ${p.commentary.length} commentary lines`);
  if (p.captions.length < 3) warns.push(`only ${p.captions.length} captions`);
  for (const k of ["captions", "commentary", "events", "ball", "actions"]) {
    const a = raw[k] || [];
    for (let i = 1; i < a.length; i++) if (a[i].t < a[i - 1].t) errors.push(`${k} not in time order at index ${i}`);
    for (const e of a) if (e.t > raw.duration) errors.push(`${k} entry at ${e.t}s is after the duration`);
  }

  // Goals: the ball in the right-hand net at the goal moment, with time to breathe after
  const goals = p.events.filter(e => e.type === "goal");
  if (!goals.length) warns.push("no goal event");
  for (const g of goals) {
    const kf = p.ball.find(k => Math.abs(k.t - g.t) < 0.06);
    if (!kf || kf.with || kf.x < 104.9 || kf.x > 107 || kf.y < 30.4 || kf.y > 37.6) {
      errors.push(`goal at ${g.t}s needs a ball keyframe at the same time with x 105-107 and y 30.4-37.6`);
    }
    if (g.team !== "A") warns.push(`goal at ${g.t}s is credited to team ${g.team}; team A should score`);
    if (p.duration - g.t < 1.5) warns.push(`only ${(p.duration - g.t).toFixed(1)} s after the goal`);
  }

  // Ball speeds between keyframes that aren't dribbles
  const byId = Object.fromEntries(p.players.map(x => [x.id, x]));
  const at = (k, t) => (k.with ? api.pathPos(byId[k.with].path, t) : { x: k.x, y: k.y });
  for (let i = 0; i + 1 < p.ball.length; i++) {
    const a = p.ball[i], b = p.ball[i + 1];
    if (a.with && a.with === b.with) continue;
    const pa = at(a, a.t), pb = at(b, b.t);
    const d = Math.hypot(pb.x - pa.x, pb.y - pa.y), v = d / (b.t - a.t);
    if (v > 38) errors.push(`ball ${a.t}->${b.t}s travels ${v.toFixed(0)} m/s over ${d.toFixed(0)} m (max ~35)`);
    else if (d > 4 && v < 6 && !b.lofted) warns.push(`ball ${a.t}->${b.t}s only ${v.toFixed(1)} m/s over ${d.toFixed(0)} m`);
  }

  // Running speeds
  for (const pl of p.players) {
    let prev = api.pathPos(pl.path, 0);
    for (let t = 0.1; t <= p.duration + 1e-9; t += 0.1) {
      const q = api.pathPos(pl.path, t);
      const v = Math.hypot(q.x - prev.x, q.y - prev.y) / 0.1;
      if (v > 10.5) { errors.push(`${pl.id} moves ${v.toFixed(1)} m/s around ${t.toFixed(1)}s (max ~9.5)`); break; }
      prev = q;
    }
  }

  // Players standing on top of each other
  let contacts = 0;
  const examples = [];
  for (let t = 0; t <= p.duration + 1e-9; t += 0.25) {
    const pos = p.players.map(pl => [pl.id, api.pathPos(pl.path, t)]);
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const d = Math.hypot(pos[i][1].x - pos[j][1].x, pos[i][1].y - pos[j][1].y);
        if (d < 1.3) { contacts++; if (examples.length < 4) examples.push(`${pos[i][0]}/${pos[j][0]} @${t.toFixed(2)}s`); }
      }
    }
  }
  if (contacts > 6) warns.push(`${contacts} close contacts under 1.3 m, e.g. ${examples.join(", ")}`);
  return { errors, warns };
}

const args = process.argv.slice(2);
const items = args[0] === "--builtin"
  ? [["MESSI_2011", api.MESSI_2011], ["GIVE_AND_GO", api.GIVE_AND_GO], ["OVERLAP", api.OVERLAP]]
  : args.map(f => {
      try { return [f, JSON.parse(fs.readFileSync(f, "utf8"))]; } catch (e) { return [f, { __parseError: e.message }]; }
    });
let failed = 0;
for (const [label, raw] of items) {
  const r = raw.__parseError ? { errors: [`not valid JSON: ${raw.__parseError}`], warns: [] } : check(raw);
  if (r.errors.length) failed++;
  console.log(`${r.errors.length ? "FAIL" : "PASS"}  ${label}`);
  r.errors.forEach(e => console.log(`   error: ${e}`));
  r.warns.forEach(w => console.log(`   warn:  ${w}`));
}
process.exit(failed ? 1 : 0);
