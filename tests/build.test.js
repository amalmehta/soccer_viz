// The built website. docs/ is what GitHub Pages serves, and it is committed, so it goes stale the
// moment the app or a clip changes and the build is not run. Nothing about the page says so: it
// just keeps serving yesterday's app. These are the checks that catch that before a push does.
//
// Rebuild with:  python3 tools/build_library.py && python3 build_site.py
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");
const { ROOT, html, libraryFiles, readPlay } = require("./app");
const { test, ok, equal, same, fail } = require("./harness");

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const bytes = rel => fs.readFileSync(path.join(ROOT, rel));
const sha = buffers => crypto.createHash("sha1").update(Buffer.concat(buffers)).digest("hex").slice(0, 10);
const ASSETS = ["sound/recordings.js", "sound/crowd.js", "sound/score.js", "sound/voice.js", "library/clips.js",
  "looks/stadium3d.js"];

test("the bundled library is the one in library/plays", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(read("library/clips.js"), sandbox);
  const bundled = sandbox.window.BirdseyeClips;
  ok(Array.isArray(bundled), "clips.js hands the page an array of plays");
  equal(bundled.length, libraryFiles.length, "clips in the bundle against files in library/plays");
  for (const file of libraryFiles) {
    const stem = path.basename(file, ".json");
    const play = bundled.find(p => p.id === stem);
    if (!play) fail(`${stem} is in library/plays but not in library/clips.js — run tools/build_library.py`);
    // The file name is the clip's address, so it has to survive the bundling
    const source = { ...readPlay(file), id: stem };
    if (JSON.stringify(play) !== JSON.stringify(source)) {
      fail(`${stem} differs between library/plays and library/clips.js — run tools/build_library.py`);
    }
  }
});

test("the website is built from the app as it stands", () => {
  const index = read("docs/index.html");
  const script = html.slice(html.indexOf("<script>\n(() => {"), html.lastIndexOf("</script>"));
  ok(index.includes(script), "docs/index.html carries the current app — run python3 build_site.py");
  ok(index.includes("window.BIRDSEYE_STANDALONE = true"), "the site build knows it is not inside Claude");
  for (const rel of ASSETS) {
    same(bytes("docs/" + rel), bytes(rel), `docs/${rel} against ${rel}`);
  }
});

test("a new build cannot be served from an old cache", () => {
  // Every script URL carries a hash of what it is serving, and the service worker's cache is named
  // after the files in it. Both were added because a rebuilt site kept showing the old one.
  const index = read("docs/index.html");
  const version = sha(ASSETS.map(bytes));
  for (const rel of ASSETS) {
    ok(index.includes(`src="${rel}?v=${version}"`), `${rel} is asked for by its current contents`);
  }
  const sw = read("docs/sw.js");
  const cache = /const CACHE = "birdseye-([0-9a-f]+)"/.exec(sw);
  const shell = /const SHELL = (\[[\s\S]*?\]);/.exec(sw);
  ok(cache && shell, "the service worker names a cache and lists what is in it");
  const files = JSON.parse(shell[1]);
  for (const rel of ["index.html", ...ASSETS]) ok(files.includes(rel), `${rel} is cached for offline use`);
  equal(cache[1], sha(files.map(p => bytes("docs/" + (p === "./" ? "index.html" : p)))),
    "the cache name against what is in docs/ — run python3 build_site.py");
});

test("the page can run with nothing but what is in the repository", () => {
  // The app sat on a blank pitch for as long as a CDN was unreachable, because a stylesheet still
  // loading blocks every script. Fonts load without blocking now and the video muxer is deferred.
  const fonts = /<link[^>]*rel="stylesheet"[^>]*>/.exec(html);
  ok(fonts && /fonts\.googleapis\.com/.test(fonts[0]), "the page asks for its fonts");
  ok(/media="print"/.test(fonts[0]) && /onload=/.test(fonts[0]),
    `the fonts stylesheet does not block the scripts: ${fonts[0].replace(/\s+/g, " ").slice(0, 90)}`);
  ok(/<noscript><link rel="stylesheet"/.test(html), "and they still arrive with no JavaScript");
  const muxer = /<script[^>]*mp4-muxer[^>]*>/.exec(html);
  ok(muxer && /\bdefer\b/.test(muxer[0]), "the video muxer is deferred, so a slow CDN cannot hold the page up");
  for (const rel of ASSETS) ok(fs.existsSync(path.join(ROOT, rel)), `${rel} ships with the page`);
});
