// Screenshot a page with headless Chrome, driven over the DevTools protocol. Used to check the app
// really renders what it should: run a snippet on the page (pick a clip, pause it, seek), then grab
// the frame at 2x for a legible picture.
//
// Usage: node tools/shot.js <url> <out.png> [width] [height] [settleMs] [scriptFile] [afterMs]
"use strict";
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [url, out, w = 1280, h = 860, settle = 3500, scriptFile, after = 600] = process.argv.slice(2);
const PORT = 9333 + Math.floor(Math.random() * 60);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (!url || !out) {
    console.error("usage: node tools/shot.js <url> <out.png> [width] [height] [settleMs] [scriptFile] [afterMs]");
    process.exit(2);
  }
  const profile = fs.mkdtempSync(os.tmpdir() + "/birdseye-shot-");
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio",
    `--remote-debugging-port=${PORT}`, `--window-size=${w},${h}`,
    `--user-data-dir=${profile}`, "about:blank"
  ], { stdio: "ignore" });

  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try {
      target = (await fetch(`http://localhost:${PORT}/json/list`).then(r => r.json())).find(t => t.type === "page");
    } catch { /* chrome is still starting */ }
  }
  if (!target) { chrome.kill(); throw new Error("chrome did not start"); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  });
  const send = (method, params = {}) =>
    new Promise(res => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })); });

  await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: 2, mobile: false });
  await send("Page.enable");
  await send("Page.navigate", { url });
  await sleep(+settle);
  if (scriptFile) {
    const r = await send("Runtime.evaluate",
      { expression: fs.readFileSync(scriptFile, "utf8"), awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) {
      console.error("page script error:", r.exceptionDetails.text,
        r.exceptionDetails.exception && r.exceptionDetails.exception.description);
    } else {
      console.log("page script:", JSON.stringify(r.result && r.result.value));
    }
    await sleep(+after);
  }
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(out, Buffer.from(data, "base64"));
  ws.close();
  chrome.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* chrome may still hold it */ }
  console.log("wrote", out, fs.statSync(out).size, "bytes");
  process.exit(0);
})();
