// Runs the tests. Everything here is plain Node and the app's own code; there is nothing to install.
//
//   node tests/run.js                 every test except the slow one
//   node tests/run.js validate ball   only the tests whose file or name says that
//   node tests/run.js --all           include the end-to-end video export (opens headless Chrome)
"use strict";
const fs = require("fs");
const path = require("path");
const { setFile, run } = require("./harness");

const args = process.argv.slice(2);
const all = args.includes("--all");
const only = args.filter(a => !a.startsWith("--"));

// *.test.js always runs; *.e2e.js needs a browser, so it waits to be asked for by name or --all
const files = fs.readdirSync(__dirname)
  .filter(f => f.endsWith(".test.js") || (f.endsWith(".e2e.js") && (all || only.some(o => f.includes(o)))))
  .sort();

for (const f of files) {
  setFile(f);
  require(path.join(__dirname, f));
}
setFile("");

run(only).then(failed => process.exit(failed ? 1 : 0));
