// Runs every library check in one go: the play validator, the six movement and ball checks, and a
// check that library/clips.js is the bundle of library/plays/ as it stands.
//
// Every checker runs even when an earlier one fails, because one clip breaking the speed limit says
// nothing about whether the ball passes through bodies, and both are worth knowing in one pass.
// Each checker's own output is printed as it comes, then a one-line verdict per checker at the end.
// Usage: node tools/check_all.js [library/plays/*.json]   (no arguments = every clip)
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CHECKERS = [
  ["check_plays.js", "timing, speeds, spacing, kits, wording, goal geometry"],
  ["check_motion.js", "facing against direction of travel, and the run cycle"],
  ["check_turn.js", "shoulders come round no faster than a body's, without flicking"],
  ["check_glide.js", "human top speed and human changes of pace"],
  ["check_ball.js", "the ball never travels through a body"],
  ["check_press.js", "defenders near the ball close it down rather than back off"],
  ["check_flight.js", "the ball travels between keyframes rather than jumping"],
];

const args = process.argv.slice(2);
const files = args.length
  ? args
  : fs.readdirSync(path.join(ROOT, "library", "plays"))
      .filter(f => f.endsWith(".json"))
      .sort()
      .map(f => path.join("library", "plays", f));

if (!files.length) {
  console.error("no play files to check");
  process.exit(2);
}
const count = `${files.length} clip${files.length === 1 ? "" : "s"}`;
console.log(`Checking ${count}.\n`);

const results = [];

for (const [script, what] of CHECKERS) {
  console.log(`${"=".repeat(78)}\n${script} — ${what}\n`);
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools", script), ...files], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = (r.stdout || "") + (r.stderr || "");
  process.stdout.write(out.endsWith("\n") || !out ? out : out + "\n");

  // The exit code is what decides it; the per-clip lines only say how many clips were at fault.
  const lines = out.split("\n");
  const failed = lines.filter(l => /^FAIL\b/.test(l)).length;
  const passed = lines.filter(l => /^(PASS|ok)\b/.test(l)).length;
  let note = "";
  if (r.error) note = `could not run it: ${r.error.message}`;
  else if (r.signal) note = `killed by ${r.signal}`;
  else if (r.status !== 0 && r.status !== 1) note = `exited ${r.status} without judging the clips`;
  else if (failed + passed === files.length) {
    note = files.length === 1 ? (failed ? "the clip failed" : "the clip passes")
      : (failed ? `${failed} of ${count} failed` : `all ${count} pass`);
  }
  else note = r.status === 0 ? "pass" : "fail";
  results.push({ name: script, ok: !r.error && !r.signal && r.status === 0, note });
  console.log("");
}

// Is library/clips.js the bundle of library/plays/ as it stands? Rebuild it somewhere else and
// compare: the build tool writes beside its own copy, so a mirror directory holding nothing but the
// tool and a link to the real plays leaves the committed bundle untouched.
console.log(`${"=".repeat(78)}\nlibrary/clips.js — up to date with library/plays/\n`);
const bundle = (() => {
  const fail = note => { console.log(`FAIL  ${note}`); return { ok: false, note }; };
  const live = path.join(ROOT, "library", "clips.js");
  if (!fs.existsSync(live)) return fail("library/clips.js is missing; run python3 tools/build_library.py");
  let tmp;
  try {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "birdseye-clips-"));
    fs.mkdirSync(path.join(tmp, "tools"));
    fs.mkdirSync(path.join(tmp, "library"));
    fs.copyFileSync(path.join(ROOT, "tools", "build_library.py"), path.join(tmp, "tools", "build_library.py"));
    fs.symlinkSync(path.join(ROOT, "library", "plays"), path.join(tmp, "library", "plays"), "dir");
    const r = spawnSync("python3", ["-I", path.join(tmp, "tools", "build_library.py")], { cwd: tmp, encoding: "utf8" });
    if (r.error) return fail(`could not run build_library.py: ${r.error.message}`);
    if (r.status !== 0) {
      process.stdout.write((r.stdout || "") + (r.stderr || ""));
      return fail(`build_library.py exited ${r.status}`);
    }
    const built = fs.readFileSync(path.join(tmp, "library", "clips.js"));
    const committed = fs.readFileSync(live);
    if (built.equals(committed)) {
      console.log(`ok    library/clips.js matches a fresh bundle of library/plays/ (${Math.round(committed.length / 1024)} KB)`);
      return { ok: true, note: "matches a fresh bundle" };
    }
    const b = built.toString("utf8").split("\n"), c = committed.toString("utf8").split("\n");
    const at = b.findIndex((l, i) => l !== c[i]);
    console.log(`FAIL  library/clips.js is not a bundle of library/plays/ as it stands`);
    console.log(`         committed ${committed.length} bytes in ${c.length - 1} lines, rebuilt ${built.length} bytes in ${b.length - 1} lines`);
    if (at >= 0) console.log(`         first difference on line ${at + 1} (a clip per line, in file-name order)`);
    console.log(`         run: python3 tools/build_library.py && python3 build_site.py`);
    return { ok: false, note: "stale; rebuild with python3 tools/build_library.py" };
  } catch (e) {
    return fail(`could not compare: ${e.message}`);
  } finally {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  }
})();
results.push({ name: "library/clips.js", ok: bundle.ok, note: bundle.note });

console.log(`\n${"=".repeat(78)}\nSummary\n`);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(18)} ${r.note}`);
const bad = results.filter(r => !r.ok);
console.log(`\n${bad.length ? `${bad.length} of ${results.length} checks failed: ${bad.map(r => r.name).join(", ")}` : `all ${results.length} checks pass`}`);
process.exit(bad.length ? 1 : 0);
