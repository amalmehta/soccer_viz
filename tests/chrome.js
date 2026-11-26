// A page in a headless Chrome, driven over the DevTools protocol — the same way tools/shot.js
// takes its screenshots, so there is nothing to install beyond the browser itself and python3
// for the local server.
"use strict";
const fs = require("fs");
const os = require("os");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");
const { ROOT } = require("./app");

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const freePort = () => new Promise(resolve => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

// The app as it is served: relative paths to the library and the sound, as on the website
async function serve(dir = ROOT) {
  const port = await freePort();
  const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", dir], { stdio: "ignore" });
  for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await sleep(100); }
  }
  return { port, url: p => `http://127.0.0.1:${port}/${p}`, stop: () => server.kill() };
}

async function browser({ width = 1280, height = 900, downloads = null } = {}) {
  if (!fs.existsSync(CHROME)) throw new Error(`Chrome is not at ${CHROME}. Set CHROME_PATH.`);
  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "birdseye-e2e-"));
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--mute-audio", "--no-first-run", "--no-default-browser-check",
    `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, `--user-data-dir=${profile}`, "about:blank"
  ], { stdio: "ignore" });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try { target = (await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json())).find(t => t.type === "page"); }
    catch { /* chrome is still starting */ }
  }
  if (!target) { chrome.kill(); throw new Error("Chrome did not start"); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
  let id = 0;
  const pending = new Map();
  // Anything the page complains about. A renderer that throws halfway through a frame leaves a
  // half-drawn scene and says nothing, so the console is the only place it shows up.
  const errors = [];
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails;
      errors.push((d.exception && d.exception.description) || d.text);
    }
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      errors.push(m.params.args.map(a => a.description || a.value || "").join(" "));
    }
  });
  const send = (method, params = {}) =>
    new Promise(res => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })); });

  const evaluate = async expression => {
    const { result } = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  // A page script of more than one line gets its own scope, so a second call can declare the same
  // names as the first
  const run = body => evaluate(`(() => {\n${body}\n})()`);

  const until = async (expression, { tries = 80, every = 250, what = "" } = {}) => {
    for (let i = 0; i < tries; i++) {
      if (await evaluate(expression)) return true;
      await sleep(every);
    }
    throw new Error(`gave up waiting for ${what || expression}`);
  };

  await send("Runtime.enable");
  await send("Page.enable");
  if (downloads) await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads, eventsEnabled: true });

  return {
    send, evaluate, run, until, errors, sleep,
    goto: url => send("Page.navigate", { url }),
    // Errors from somewhere that is not the app: a font CDN, a favicon, an advert blocker
    appErrors: () => errors.filter(e => !/favicon|fonts\.googleapis|fonts\.gstatic|jsdelivr|cdnjs|Failed to load resource/i.test(e)),
    close: () => { ws.close(); chrome.kill(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* chrome may still hold it */ } }
  };
}

module.exports = { browser, serve, freePort, sleep, CHROME };
