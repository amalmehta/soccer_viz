// The arithmetic behind a downloaded video. The frame is a fixed size for the place it is going;
// everything inside it — the pitch, the header, the caption strip — is worked out from that size,
// and if the sum is wrong the export either throws or writes a file with the play half off the
// edge. The end-to-end test (video_export.e2e.js) renders a real file; this holds the geometry.
"use strict";
const { videoLayout, VIDEO_FORMATS, W, H, M, K } = require("./app");
const { test, ok, equal, close, within } = require("./harness");

test("every format lays out a pitch inside its frame, with the words clear of it", () => {
  for (const [key, format] of Object.entries(VIDEO_FORMATS)) {
    const L = videoLayout(format);
    for (const [name, val] of Object.entries(L)) {
      if (typeof val === "number") ok(Number.isFinite(val), `${key}: ${name} is a number (${val})`);
    }
    close(L.LW, format.w / K, 1e-9, `${key}: the frame in logical units`);
    ok(L.pw > 0 && L.ph > 0, `${key}: the pitch has a size (${L.pw.toFixed(0)} × ${L.ph.toFixed(0)})`);
    within(L.px, 0, L.LW - L.pw + 1e-9, `${key}: the pitch's left edge`);
    within(L.py, format.safeTop, L.LH - format.safeBottom - L.ph + 1e-9, `${key}: the pitch's top edge`);
    // Header above, caption below, pitch between them -- except in the vertical format, where both
    // bands sit above the pitch to stay clear of what Reels and TikTok draw over the bottom
    if (L.rotated) {
      ok(L.headerTop < L.footerTop, `${key}: the title is above the caption`);
      ok(L.footerTop < L.py, `${key}: both sit above the pitch`);
    } else {
      ok(L.headerTop < L.py, `${key}: the title is above the pitch`);
      ok(L.footerTop >= L.py + L.ph - 1e-9, `${key}: the caption is below the pitch`);
    }
    ok(L.headerTop >= format.safeTop, `${key}: the title clears the top of the frame`);
  }
});

test("the vertical format turns the pitch so the play runs up the screen", () => {
  const L = videoLayout(VIDEO_FORMATS.vertical);
  equal(L.rotated, true, "the pitch is turned");
  ok(L.ph > L.pw, `the pitch is taller than it is wide (${L.pw.toFixed(0)} × ${L.ph.toFixed(0)})`);
  close(L.ph / L.pw, (W + 2 * M) / (H + 2 * M), 0.01, "the turned pitch keeps its shape");
  for (const key of ["landscape", "square", "portrait"]) {
    const flat = videoLayout(VIDEO_FORMATS[key]);
    equal(!!flat.rotated, false, `${key} is not turned`);
    close(flat.pw / flat.ph, (W + 2 * M) / (H + 2 * M), 0.01, `${key}: the pitch keeps its shape`);
  }
});

