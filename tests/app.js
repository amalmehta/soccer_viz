// The app's own code, lifted out of birdseye.html so a test can call it directly.
//
// birdseye.html is one page with one script in it, and that is deliberate: it is the thing that
// ships. The checkers in tools/ already pull the pieces they need out of it by their section
// markers; the tests do the same, from one place, so there is a single list of what a test can
// reach and one error to read when a marker moves.
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "birdseye.html"), "utf8");
const js = html.slice(html.indexOf("<script>\n(() => {") + "<script>".length, html.lastIndexOf("</script>"));

function between(a, b) {
  const i = js.indexOf(a), j = js.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error(`marker missing in birdseye.html: ${JSON.stringify(a)}`);
  return js.slice(i, j);
}

// Geometry, validation, motion, off-ball movement, actions, the play-by-play and compile(), then
// the era table compile() reads, then the video export's own layout arithmetic. Nothing here
// touches the DOM; everything that does stays in the page, where the end-to-end test drives it.
const api = new Function(
  between("  // ---------- Pitch geometry (metres) ----------", "  // ---------- Rendering ----------") +
  between("  const yearOf = play =>", "  function renderLibrary()") +
  between("  const VIDEO_FORMATS = {", "  const FONT_MONO") +
  between("  function videoLayout(format) {", "  function withView(") +
  "\nreturn { normalizePlay, compile, pathPos, momentsOf, struckAt, humanPath, cleanPath, slugify," +
  " videoLayout, VIDEO_FORMATS, FPS, K, TOP_SPEED, MIN_GAP, W, H, M, GOAL_Y0, GOAL_Y1 };"
)();

const playsDir = path.join(ROOT, "library", "plays");
const libraryFiles = fs.readdirSync(playsDir).filter(f => f.endsWith(".json")).sort()
  .map(f => path.join(playsDir, f));
const readPlay = file => JSON.parse(fs.readFileSync(file, "utf8"));

module.exports = { ...api, ROOT, html, js, between, libraryFiles, readPlay };
