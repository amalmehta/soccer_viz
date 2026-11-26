// The app in a real browser: does it open, draw the clip it was asked for, play it to the end
// without the renderer throwing, and still fit on a phone.
//
// The checkers in tools/ read the clips; they never open the page. A renderer that throws halfway
// through a frame leaves a half-drawn scene and no message anywhere — which is exactly what
// happened the last time a property was read off an object that no longer had it, and the page
// drew an almost empty pitch for a week.
//
//   node tests/run.js --all          or      node tests/run.js app.e2e
"use strict";
const { browser, serve } = require("./chrome");
const { normalizePlay, readPlay, ROOT } = require("./app");
const path = require("path");
const { test, ok, equal, within, fail } = require("./harness");

const CLIP = "2012-drogba-bayern";
const play = normalizePlay(readPlay(path.join(ROOT, "library", "plays", `${CLIP}.json`)));

const ready = `(() => {
  const btn = document.getElementById("playBtn");
  return !!btn && document.title.includes("\\u00b7 Birdseye FC") && document.querySelectorAll("#feedBody li").length > 2;
})()`;

test("the page opens on the clip it was asked for and plays it to the end", async () => {
  const site = await serve();
  const page = await browser();
  try {
    await page.goto(site.url(`birdseye.html?clip=${CLIP}`));
    await page.until(ready, { what: "the clip to load" });

    const shown = await page.run(`
      return {
        title: document.querySelector("h1, .title")?.textContent.trim(),
        time: document.getElementById("time").textContent,
        feed: document.querySelectorAll("#feedBody li").length,
        note: (document.getElementById("note").textContent || "").trim(),
        canvas: (() => { const c = document.getElementById("pitch"); return { w: c.width, h: c.height }; })()
      };`);
    equal(shown.title, play.title, "the clip on screen");
    ok(shown.time.endsWith(`/ 0:0${play.duration.toFixed(1)}`), `the length of the clip (${shown.time})`);
    ok(shown.feed >= 3, `the play-by-play has ${shown.feed} lines`);
    // Every clip says where it came from, because none of them is traced from footage
    ok(shown.note.length > 20, `the page says where the clip came from: ${JSON.stringify(shown.note.slice(0, 60))}`);
    ok(shown.canvas.w > 0 && shown.canvas.h > 0, "the pitch has been sized");

    // Play it through at double speed, and watch the feed light up on the way
    await page.run(`
      document.querySelector('[data-speed="2"]').click();
      document.getElementById("playBtn").click();
      return true;`);
    await page.until(`document.querySelectorAll("#feedBody li.now").length === 1`, { tries: 40, what: "the feed to follow the play" });
    // Wait for the app to say it has stopped, not for the scrubber to read full: the clock can
    // reach the end a frame before playback ends, and then the button still says Pause
    await page.until(`document.getElementById("playBtn").getAttribute("aria-label") === "Play"`,
      { tries: 60, what: "the clip to reach its end and stop" });

    const ended = await page.run(`
      return {
        at: +document.getElementById("scrubber").value,
        max: +document.getElementById("scrubber").max,
        label: document.getElementById("playBtn").getAttribute("aria-label"),
        past: document.querySelectorAll("#feedBody li:not(.ahead)").length,
        all: document.querySelectorAll("#feedBody li").length
      };`);
    within(ended.at, play.duration - 0.05, play.duration + 0.05, "where the clip stopped");
    within(ended.max, play.duration - 0.01, play.duration + 0.01, "what the scrubber covers");
    equal(ended.label, "Play", "the button offers to play it again");
    equal(ended.past, ended.all, "every line of the play-by-play has been through");

    const broke = page.appErrors();
    if (broke.length) fail(`the page logged ${broke.length} error(s):\n  ${broke.slice(0, 3).join("\n  ")}`);
  } finally {
    page.close();
    site.stop();
  }
});

test("clicking a line in the play-by-play jumps to that moment", async () => {
  const site = await serve();
  const page = await browser();
  try {
    await page.goto(site.url(`birdseye.html?clip=${CLIP}`));
    await page.until(ready, { what: "the clip to load" });
    const jumped = await page.run(`
      const rows = [...document.querySelectorAll("#feedBody li")];
      const last = rows[rows.length - 1];
      last.querySelector("button").click();
      return { to: +document.getElementById("scrubber").value, says: last.querySelector(".at").textContent };`);
    ok(jumped.to > 1, `the clip moved to ${jumped.to.toFixed(1)}s, which the line says is ${jumped.says}`);
    const [m, s] = jumped.says.split(":").map(Number);
    within(jumped.to, m * 60 + s - 1, m * 60 + s + 1, "where it landed against what the line says");
    if (page.appErrors().length) fail(`seeking logged an error: ${page.appErrors()[0]}`);
  } finally {
    page.close();
    site.stop();
  }
});

test("the built website fits a phone without scrolling sideways", async () => {
  // 400 px wide, which is where the app was asked to be usable. Against docs/, because that is the
  // page people actually open: birdseye.html is the app's body and the site build gives it a head.
  const site = await serve();
  const page = await browser({ width: 400, height: 860 });
  try {
    await page.send("Emulation.setDeviceMetricsOverride", { width: 400, height: 860, deviceScaleFactor: 2, mobile: true });
    await page.goto(site.url(`docs/index.html?clip=${CLIP}`));
    await page.until(ready, { what: "the clip to load" });
    const fit = await page.run(`
      return {
        page: document.documentElement.scrollWidth,
        window: window.innerWidth,
        wide: [...document.querySelectorAll("body *")]
          .filter(el => el.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(0, 4).map(el => (el.id || el.className || el.tagName) + " to " + Math.round(el.getBoundingClientRect().right))
      };`);
    equal(fit.window, 400, "the window under test");
    ok(fit.page <= fit.window + 1, `the page is ${fit.page} px wide in a ${fit.window} px window; past the edge: ${fit.wide.join(", ") || "nothing"}`);
    if (page.appErrors().length) fail(`the page logged an error at phone width: ${page.appErrors()[0]}`);
  } finally {
    page.close();
    site.stop();
  }
});
