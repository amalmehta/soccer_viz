// A test runner the size of the thing it runs. No dependencies, because the app has none either:
// a test file calls test("what should be true", fn) and throws when it is not.
"use strict";

const cases = [];
let file = "";

function test(name, fn) { cases.push({ file, name, fn }); }
function setFile(f) { file = f; }

function fail(message) {
  const e = new Error(message);
  e.assertion = true;
  throw e;
}

const show = v => {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || v == null || typeof v === "boolean") return String(v);
  const s = JSON.stringify(v);
  return s && s.length > 160 ? s.slice(0, 157) + "…" : s;
};

const ok = (v, what) => { if (!v) fail(`${what}: expected something true, got ${show(v)}`); };
const equal = (a, b, what) => { if (a !== b) fail(`${what}: expected ${show(b)}, got ${show(a)}`); };
const same = (a, b, what) => {
  const [x, y] = [JSON.stringify(a), JSON.stringify(b)];
  if (x !== y) fail(`${what}:\n  expected ${show(b)}\n  got      ${show(a)}`);
};
const close = (a, b, tol, what) => {
  if (!(Math.abs(a - b) <= tol)) fail(`${what}: expected ${show(b)} ± ${tol}, got ${show(a)}`);
};
const within = (v, lo, hi, what) => {
  if (!(v >= lo && v <= hi)) fail(`${what}: expected between ${lo} and ${hi}, got ${show(v)}`);
};
// The validator's job is as much about what it refuses as what it lets through, so refusing is
// something a test can ask for directly.
const throws = (fn, match, what) => {
  let threw = null;
  try { fn(); } catch (e) { threw = e; }
  if (!threw) fail(`${what}: expected it to be refused, but it was accepted`);
  if (match && !match.test(threw.message)) fail(`${what}: refused with ${show(threw.message)}, which does not match ${match}`);
  return threw;
};

async function run(only) {
  const chosen = only && only.length ? cases.filter(c => only.some(o => (c.file + " " + c.name).includes(o))) : cases;
  let failed = 0, last = null;
  for (const c of chosen) {
    if (c.file !== last) { console.log(`\n${c.file}`); last = c.file; }
    try {
      await c.fn();
      console.log(`  ok    ${c.name}`);
    } catch (e) {
      failed++;
      console.log(`  FAIL  ${c.name}`);
      console.log(`        ${(e && e.message || e).toString().split("\n").join("\n        ")}`);
      if (e && !e.assertion && e.stack) console.log(`        ${e.stack.split("\n").slice(1, 3).join("\n        ").trim()}`);
    }
  }
  console.log(`\n${chosen.length - failed} of ${chosen.length} passed${failed ? `, ${failed} failed` : ""}.`);
  return failed;
}

module.exports = { test, setFile, run, ok, equal, same, close, within, throws, fail, cases };
