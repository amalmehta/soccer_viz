// Exporting a video, end to end, in a real browser: pick a clip, press Download, and look at the
// file that lands on disk.
//
// This is one of the two tests that need a browser, because video export cannot be reached any
// other way — it draws frames on a canvas, encodes them with WebCodecs and hands the file to the
// page. It is also the feature that has broken silently: the export threw on its first line for
// weeks after the Broadcast look was removed, and nothing noticed, because the failure lands in a
// status message beside the button while the clips themselves went on playing.
//
//   node tests/run.js --all          or      node tests/run.js export
//
// Needs Google Chrome (CHROME_PATH to point somewhere else) and python3 for the local server.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { VIDEO_FORMATS } = require("./app");
const { browser, serve, sleep } = require("./chrome");
const { test, ok, equal, fail } = require("./harness");

const CLIP = "2012-drogba-bayern";           // the shortest clip in the library: 8.5 s to render

// The MP4's own idea of how big its picture is, read out of the track header rather than ours
function mp4Size(buf) {
  const at = buf.indexOf("tkhd");
  if (at < 0) return null;
  const box = at - 4;                             // the box's length sits in front of its name
  const version = buf[box + 8];
  const end = box + (version === 1 ? 104 : 92);   // the picture's size closes the header
  return { w: buf.readUInt32BE(end - 8) / 65536, h: buf.readUInt32BE(end - 4) / 65536 };
}

test("every video format exports a file that is really a video of the right size", async () => {
  const downloads = fs.mkdtempSync(path.join(os.tmpdir(), "birdseye-downloads-"));
  const site = await serve();
  const page = await browser({ downloads });
  try {
    await page.goto(site.url(`birdseye.html?clip=${CLIP}`));
    // Ready when the clip asked for has been drawn and the formats are listed
    await page.until(`(() => {
      const btn = document.getElementById("videoBtn"), sel = document.getElementById("videoFormat");
      return !!btn && !btn.disabled && !!sel && sel.options.length === 4
        && document.title.includes("\\u00b7 Birdseye FC") && document.querySelectorAll("#feedBody li").length > 2;
    })()`, { what: "the clip to load" });
    equal(await page.evaluate(`new URL(location.href).searchParams.get("clip")`), CLIP, "the clip under test");

    // Sound is its own path through the exporter and its own minutes; the picture is the point here
    await page.run(`
      for (const id of ["crowdBtn", "scoreBtn", "voiceBtn"]) {
        const b = document.getElementById(id);
        if (b && b.getAttribute("aria-pressed") === "true") b.click();
      }
      return true;`);

    const formats = await page.evaluate(`[...document.getElementById("videoFormat").options].map(o => o.value)`);
    equal(formats.length, 4, "formats offered");

    for (const format of formats) {
      const before = new Set(fs.readdirSync(downloads));
      await page.run(`
        const sel = document.getElementById("videoFormat");
        sel.value = ${JSON.stringify(format)};
        sel.dispatchEvent(new Event("change"));
        document.getElementById("videoStatus").textContent = "";
        document.getElementById("videoBtn").click();
        return true;`);

      // The button says what it is doing, and says it when it stops: anything that is not progress
      // and not a saved file is the export having given up
      let status = "";
      const started = Date.now();
      while (Date.now() - started < 180000) {
        await sleep(500);
        status = await page.evaluate(`document.getElementById("videoStatus").textContent`);
        if (/^(Downloaded|Saved)/.test(status)) break;
        if (status && !/^(Rendering|Recording|Mixing|Adding|Confirm)/.test(status)) fail(`${format}: the export gave up with "${status}"`);
      }
      if (!/^(Downloaded|Saved)/.test(status)) fail(`${format}: the export never finished (last said "${status}")`);

      let file = null;
      for (let i = 0; i < 40 && !file; i++) {
        file = fs.readdirSync(downloads).find(f => !before.has(f) && !f.endsWith(".crdownload")) || null;
        if (!file) await sleep(250);
      }
      if (!file) fail(`${format}: the page said "${status}" but nothing was saved`);
      ok(status.includes(file), `the status names the file it saved ("${status}")`);
      ok(file.includes(format), `${format}: the file says which format it is (${file})`);
      ok(/\.(mp4|webm)$/.test(file), `${format}: a video file (${file})`);

      const data = fs.readFileSync(path.join(downloads, file));
      ok(data.length > 40000, `${format}: the file has a clip in it (${Math.round(data.length / 1024)} KB)`);
      if (file.endsWith(".mp4")) {
        equal(data.slice(4, 8).toString(), "ftyp", `${format}: the file starts like an MP4`);
        const size = mp4Size(data);
        ok(size, `${format}: the file says how big its picture is`);
        equal(size.w, VIDEO_FORMATS[format].w, `${format}: the width in the file`);
        equal(size.h, VIDEO_FORMATS[format].h, `${format}: the height in the file`);
      }
    }
    const broke = page.appErrors();
    if (broke.length) fail(`the browser logged ${broke.length} error(s) during the exports:\n  ${broke.slice(0, 3).join("\n  ")}`);
  } finally {
    page.close();
    site.stop();
    try { fs.rmSync(downloads, { recursive: true, force: true }); } catch { /* nothing to clean */ }
  }
});
