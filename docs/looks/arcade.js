// Arcade look: game-style top-down view. Textured pitch in a floodlit stadium, running
// player sprites, a camera that follows the ball and zooms in on goals.
(() => {
  "use strict";
  const PXM = 16;                                   // texture pixels per metre
  const X0 = -16, Y0 = -18, TW = 137, TH = 104;     // texture covers x -16..121, y -18..86
  const K = 1.6;                                    // sprite exaggeration so players read at small sizes
  const SKIN = ["#8d5524", "#c68642", "#e0ac69", "#f1c27d", "#ffdbac", "#5c3a21"];
  const HAIR = ["#1b130d", "#2b1d14", "#3b2a1a", "#0e0e0e", "#6b4b2a"];
  const worlds = new WeakMap();

  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const clampRange = (v, a, b) => (a > b ? (a + b) / 2 : clamp(v, a, b));
  const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  // 0 at a, 1 at b, back to 0 at c
  const bump = (x, a, b, c) => (x < b ? smooth((x - a) / (b - a)) : 1 - smooth((x - b) / (c - b)));

  function goalMoment(play, t) {
    let best = null;
    for (const ev of play.events) {
      if (ev.type !== "goal") continue;
      const since = t - ev.t;
      if (since > -1.5 && since < 3 && (!best || Math.abs(since) < Math.abs(best.since))) best = { since, ev };
    }
    return best;
  }

  function buildWorld(play, api) {
    const c = document.createElement("canvas");
    c.width = TW * PXM;
    c.height = TH * PXM;
    const g = c.getContext("2d");
    const rand = rng(hash(play.title));
    const venue = play.venue;
    const m = venue.track ? 12.5 : 6; // stands start beyond the boards, or beyond the running track
    g.setTransform(PXM, 0, 0, PXM, -X0 * PXM, -Y0 * PXM); // draw in metres

    // Stands and crowd
    g.fillStyle = api.shade(venue.stands, 0.35);
    g.fillRect(X0, Y0, TW, TH);
    const crowd = [play.teams.A.color, play.teams.B.color, play.teams.A.color2, venue.stands, venue.stands, venue.accent, "#e8e4da", "#3a4150", "#c9ccd3"];
    for (let y = Y0 + 0.4; y < Y0 + TH; y += 0.72) {
      for (let x = X0 + 0.4; x < X0 + TW; x += 0.72) {
        if (x > -m && x < 105 + m && y > -m && y < 68 + m) continue;
        if (rand() < 0.1) continue;
        g.globalAlpha = 0.3 + rand() * 0.55;
        g.fillStyle = crowd[Math.floor(rand() * crowd.length)];
        g.beginPath();
        g.arc(x + (rand() - 0.5) * 0.3, y + (rand() - 0.5) * 0.3, 0.25, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    // Stand tiers
    g.strokeStyle = "rgba(0,0,0,0.35)";
    g.lineWidth = 0.35;
    for (let d = 4; d < 24; d += 6) { g.strokeRect(-m - d, -m - d, 105 + 2 * (m + d), 68 + 2 * (m + d)); }
    // Roofs throw the stands into shade: the back rows under a partial roof, everything under a closed one
    if (venue.roof !== "open") {
      g.fillStyle = venue.roof === "closed" ? "rgba(0,0,0,0.42)" : "rgba(0,0,0,0.3)";
      const inner = venue.roof === "closed" ? m : m + 9;
      g.beginPath();
      g.rect(X0, Y0, TW, TH);
      g.rect(-inner, 68 + inner, 105 + 2 * inner, -(68 + 2 * inner));
      g.fill("evenodd");
      g.strokeStyle = venue.accent;
      g.globalAlpha = 0.5;
      g.lineWidth = 0.5;
      g.strokeRect(-inner, -inner, 105 + 2 * inner, 68 + 2 * inner);
      g.globalAlpha = 1;
    }

    // Athletics track: red tartan with lane lines
    if (venue.track) {
      g.fillStyle = "#9c4a36";
      g.fillRect(-m, -m, 105 + 2 * m, 68 + 2 * m);
      g.strokeStyle = "rgba(255,255,255,0.35)";
      g.lineWidth = 0.05;
      for (let lane = 1; lane < 6; lane++) {
        const inset = m - 6.5 + lane * 1.1;
        g.strokeRect(-inset, -inset, 105 + 2 * inset, 68 + 2 * inset);
      }
    }

    // Apron and pitch grass
    g.fillStyle = api.shade(venue.grass, 0.72);
    g.fillRect(-6, -6, 117, 80);
    g.fillStyle = venue.grass;
    g.fillRect(-3.5, -3.5, 112, 75);
    const bands = 18;
    if (venue.mowing !== "plain") {
      for (let i = 0; i < bands; i += 2) {
        g.fillStyle = "rgba(255,255,255,0.05)";
        g.fillRect((i * 105) / bands, -3.5, 105 / bands, 75);
      }
    }
    if (venue.mowing === "checks") {
      for (let j = 0; j < 12; j += 2) {
        g.fillStyle = "rgba(0,0,0,0.07)";
        g.fillRect(-3.5, (j * 68) / 12, 112, 68 / 12);
      }
    }
    for (let i = 0; i < 26000; i++) {
      g.fillStyle = rand() < 0.5 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.05)";
      g.fillRect(-3.5 + rand() * 112, -3.5 + rand() * 75, 0.06 + rand() * 0.16, 0.06 + rand() * 0.16);
    }
    for (const gx of [6, 99]) {
      const wear = g.createRadialGradient(gx, 34, 0, gx, 34, 9);
      wear.addColorStop(0, "rgba(150,130,70,0.22)");
      wear.addColorStop(1, "rgba(150,130,70,0)");
      g.fillStyle = wear;
      g.fillRect(gx - 9, 25, 18, 18);
    }

    // Markings
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 0.13;
    const arc = (x, y, r, a0, a1) => { g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); };
    const spot = (x, y) => { g.beginPath(); g.arc(x, y, 0.22, 0, Math.PI * 2); g.fill(); };
    g.strokeRect(0, 0, 105, 68);
    g.beginPath(); g.moveTo(52.5, 0); g.lineTo(52.5, 68); g.stroke();
    arc(52.5, 34, 9.15, 0, Math.PI * 2);
    spot(52.5, 34);
    const arcA = Math.acos(5.5 / 9.15);
    for (const side of [0, 1]) {
      const f = x => (side ? 105 - x : x);
      g.strokeRect(Math.min(f(0), f(16.5)), 13.84, 16.5, 40.32);
      g.strokeRect(Math.min(f(0), f(5.5)), 24.84, 5.5, 18.32);
      spot(f(11), 34);
      if (side) arc(94, 34, 9.15, Math.PI - arcA, Math.PI + arcA); else arc(11, 34, 9.15, -arcA, arcA);
      // Goal with net
      const gx = side ? 105 : -2;
      g.fillStyle = "rgba(255,255,255,0.08)";
      g.fillRect(gx, 30.34, 2, 7.32);
      g.strokeStyle = "rgba(255,255,255,0.28)";
      g.lineWidth = 0.04;
      for (let y = 30.34; y <= 37.66; y += 0.3) { g.beginPath(); g.moveTo(gx, y); g.lineTo(gx + 2, y); g.stroke(); }
      for (let x = gx; x <= gx + 2; x += 0.3) { g.beginPath(); g.moveTo(x, 30.34); g.lineTo(x, 37.66); g.stroke(); }
      g.strokeStyle = "#ffffff";
      g.lineWidth = 0.18;
      g.strokeRect(gx, 30.34, 2, 7.32);
      g.strokeStyle = "rgba(255,255,255,0.9)";
      g.fillStyle = "rgba(255,255,255,0.9)";
      g.lineWidth = 0.13;
    }
    arc(0, 0, 1, 0, Math.PI / 2);
    arc(105, 0, 1, Math.PI / 2, Math.PI);
    arc(0, 68, 1, -Math.PI / 2, 0);
    arc(105, 68, 1, Math.PI, Math.PI * 1.5);

    // Advertising boards
    g.fillStyle = "#10151c";
    g.fillRect(-6, -6, 117, 1.1);
    g.fillRect(-6, 72.9, 117, 1.1);
    g.fillRect(-6, -6, 1.1, 80);
    g.fillRect(109.9, -6, 1.1, 80);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = `900 ${0.85 * PXM}px ${api.fonts.display}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const board = (x, y, rot) => {
      g.save();
      g.translate((x - X0) * PXM, (y - Y0) * PXM);
      g.rotate(rot);
      g.fillStyle = "#FFC53D";
      g.fillText("BIRDSEYE FC", 0, 0);
      g.restore();
    };
    for (let x = 4; x < 105; x += 16) { board(x, -5.45, 0); board(x, 73.45, 0); }
    for (let y = 10; y < 68; y += 16) { board(-5.45, y, -Math.PI / 2); board(110.45, y, Math.PI / 2); }

    // Floodlight glow at night, a softer warm wash at dusk, none by day
    const glowAt = { night: "rgba(255,248,225,0.16)", dusk: "rgba(255,196,140,0.1)", day: null }[venue.time];
    g.globalCompositeOperation = "screen";
    for (const [lx, ly] of glowAt ? [[-8, -10], [113, -10], [-8, 78], [113, 78]] : []) {
      const light = g.createRadialGradient((lx - X0) * PXM, (ly - Y0) * PXM, 0, (lx - X0) * PXM, (ly - Y0) * PXM, 75 * PXM);
      light.addColorStop(0, glowAt);
      light.addColorStop(1, "rgba(255,248,225,0)");
      g.fillStyle = light;
      g.fillRect(0, 0, c.width, c.height);
    }
    g.globalCompositeOperation = "source-over";
    return c;
  }

  // Shirt as seen from above: stripes run front-to-back over the shoulders, hoops across them
  function kitFill(ctx, tm, gk, x, y, w, h) {
    ctx.fillStyle = gk ? tm.gkColor : tm.color;
    ctx.fillRect(x, y, w, h);
    if (gk || tm.pattern === "plain") return;
    ctx.fillStyle = tm.color2;
    if (tm.pattern === "stripes") {
      for (let i = 0; i < 5; i++) ctx.fillRect(x, y + (h * (2 * i + 0.5)) / 10, w, h / 10);
    } else if (tm.pattern === "hoops") {
      for (let i = 0; i < 4; i++) ctx.fillRect(x + (w * (2 * i + 0.5)) / 8, y, w / 8, h);
    } else if (tm.pattern === "halves") {
      ctx.fillRect(x, y, w, h / 2);
    } else if (tm.pattern === "sash") {
      ctx.beginPath();
      ctx.moveTo(x + w, y);
      ctx.lineTo(x + w, y + h * 0.3);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + h * 0.7);
      ctx.fill();
    }
  }

  // Top-down footballer facing +x. g = gait from the page: phase advances with distance run,
  // so boots plant instead of sliding; stride, arm swing and shoulder twist grow with speed.
  // Head seen from above, by hairstyle (face toward +x)
  function drawHeadTop(ctx, lk) {
    const hair = lk.hairColor;
    const blob = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    ctx.fillStyle = hair;
    if (lk.hair === "long") { ctx.beginPath(); ctx.ellipse(-0.1, 0, 0.2, 0.17, 0, 0, Math.PI * 2); ctx.fill(); }
    if (lk.hair === "ponytail") { ctx.beginPath(); ctx.ellipse(-0.23, 0, 0.1, 0.05, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = lk.skin;
    blob(0.04, 0, 0.14);
    ctx.fillStyle = hair;
    switch (lk.hair) {
      case "bald":
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        blob(0.01, -0.04, 0.045);
        break;
      case "buzz":
        ctx.globalAlpha = 0.6;
        blob(0.02, 0, 0.132);
        ctx.globalAlpha = 1;
        break;
      case "afro":
        for (let i = 0; i < 9; i++) { const q = (i * Math.PI * 2) / 9; blob(-0.02 + Math.cos(q) * 0.13, Math.sin(q) * 0.13, 0.1); }
        blob(-0.02, 0, 0.17);
        break;
      case "curly":
        for (let i = 0; i < 7; i++) { const q = (i * Math.PI * 2) / 7; blob(0.0 + Math.cos(q) * 0.09, Math.sin(q) * 0.09, 0.065); }
        blob(0.0, 0, 0.12);
        break;
      default:
        ctx.beginPath(); ctx.arc(0.01, 0, 0.142, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0.01, 0, 0.07, 0.142, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
    }
  }

  // Top-down footballer posed from the page's body model (R.bodyAt). Facing +x, right side +y.
  // Legs and arms use the shared joint angles; dives turn the body onto its side, slides and flying
  // headers stretch it along the ground, and leaving the ground scales it up over a spreading shadow.
  function drawPlayer(ctx, tm, pl, sx, sy, heading, body, s, lk, kit, boot, time) {
    const skin = lk.skin;
    const g = body.gait;
    const lift = Math.max(0, body.lift);
    const lying = Math.min(1, Math.max(Math.abs(body.roll) / 1.4, Math.max(0, Math.abs(body.pitch) - 0.5) / 0.9));
    const sideTurn = Math.sign(body.roll) * (Math.PI / 2) * Math.min(1, Math.abs(body.roll) / 1.4);
    const lean = Math.sin(clamp(body.pitch, -1.6, 1.6)) * 0.3;
    const twist = 0.14 * Math.sin(g.phase) * g.run * (1 - lying);
    const up = 1 + 0.5 * lift;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = time === "day" ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.2)";
    for (const [ox, oy] of time === "day" ? [[0.7, 0.5]] : [[0.55, 0.4], [-0.5, 0.35]]) {
      ctx.beginPath();
      ctx.ellipse(ox * (1 + 2 * lift) * s * K, oy * (1 + 2 * lift) * s * K,
        (0.5 + 0.45 * lying) * s * K * lk.scale, 0.34 * s * K * lk.scale, heading + sideTurn, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.rotate(heading + sideTurn);
    ctx.scale(s * K * up * lk.scale * (1 + 0.55 * lying), s * K * up * lk.scale);
    ctx.lineCap = "round";

    // Legs: skin at the knee, sock down to the boot; the rear leg first
    const leg = (side, l) => {
      const hy = side * 0.12, kx = Math.sin(l.hip) * 0.42, ky = hy * 0.95;
      const fx = kx + Math.sin(l.hip - l.knee) * 0.42, fy = hy * 0.85;
      ctx.strokeStyle = skin;
      ctx.lineWidth = 0.12;
      ctx.beginPath(); ctx.moveTo(-0.04, hy); ctx.lineTo(kx, ky); ctx.stroke();
      ctx.strokeStyle = tm.shorts;
      ctx.lineWidth = 0.13;
      ctx.beginPath(); ctx.moveTo(-0.04, hy); ctx.lineTo(-0.04 + (kx + 0.04) * Math.min(0.9, 0.35 * kit.shorts), hy + (ky - hy) * 0.35 * kit.shorts); ctx.stroke();
      ctx.strokeStyle = tm.socks;
      ctx.lineWidth = 0.11;
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = boot;
      ctx.beginPath(); ctx.ellipse(fx + 0.06, fy, 0.12, 0.062, 0, 0, Math.PI * 2); ctx.fill();
    };
    [[1, body.legs[0]], [-1, body.legs[1]]]
      .sort((x, y) => Math.sin(x[1].hip) - Math.sin(y[1].hip))
      .forEach(([side, l]) => leg(side, l));

    // Shorts, then the shirt twisting against the hips
    ctx.fillStyle = tm.shorts;
    ctx.beginPath(); ctx.ellipse(-0.06 + lean * 0.3, 0, 0.12 + 0.05 * kit.shorts, 0.27 * kit.fit, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(lean, 0);
    ctx.rotate(twist);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.2 * kit.fit, 0.34 * kit.fit, 0, 0, Math.PI * 2);
    ctx.save();
    ctx.clip();
    kitFill(ctx, tm, pl.gk, -0.25, -0.4, 0.5, 0.8);
    ctx.restore();
    ctx.strokeStyle = pl.gk ? "rgba(0,0,0,0.35)" : tm.color2;
    ctx.lineWidth = 0.035;
    ctx.stroke();
    if (kit.collar) {
      // Polo collar in the trim colour, seen over the shoulders
      ctx.strokeStyle = pl.gk ? "rgba(0,0,0,0.4)" : tm.color2;
      ctx.lineWidth = 0.055;
      ctx.beginPath(); ctx.arc(0.03, 0, 0.165, -1.15, 1.15); ctx.stroke();
    }

    // Arms: sleeve, forearm, hand (gloves for keepers). Raised arms come in towards the head,
    // or reach out ahead when the body is lying at full stretch.
    for (const [side, arm] of [[1, body.arms[0]], [-1, body.arms[1]]]) {
      const raised = Math.max(0, -Math.cos(arm.shoulder));
      const ex = Math.sin(arm.shoulder) * 0.28 + raised * 0.12 * lying, ey = side * (0.36 - 0.1 * raised);
      const fa = arm.shoulder + arm.elbow;
      const hx = ex + Math.sin(fa) * 0.24 + 0.06 * g.run * (1 - lying) + raised * 0.3 * lying;
      const hy = side * (0.33 - 0.14 * raised * (1 - lying));
      ctx.strokeStyle = pl.gk ? tm.gkColor : tm.color;
      ctx.lineWidth = 0.11;
      ctx.beginPath(); ctx.moveTo(0, side * 0.3); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = skin;
      ctx.lineWidth = 0.075;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = pl.gk ? "#E9F1F7" : skin;
      ctx.beginPath(); ctx.arc(hx, hy, pl.gk ? 0.065 : 0.045, 0, Math.PI * 2); ctx.fill();
    }

    drawHeadTop(ctx, lk);
    ctx.restore();
    ctx.restore();
  }

  function roundedText(ctx, api, text, x, y, size, bg, fg, stripe) {
    ctx.font = `700 ${size}px ${api.fonts.body}`;
    const w = ctx.measureText(text).width + size * 1.1 + (stripe ? size * 0.35 : 0);
    const h = size * 1.6;
    ctx.fillStyle = bg;
    api.roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fill();
    if (stripe) {
      ctx.fillStyle = stripe;
      ctx.beginPath();
      ctx.arc(x - w / 2 + h / 2, y, size * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + (stripe ? size * 0.35 : 0), y + 0.5);
  }

  function wrapLines(ctx, text, maxW, maxLines) {
    const lines = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line ? line + " " + word : word;
      if (line && ctx.measureText(next).width > maxW) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    if (lines.length <= maxLines) return lines;
    const kept = lines.slice(0, maxLines);
    let last = lines.slice(maxLines - 1).join(" ");
    while (last.length > 1 && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
    kept[maxLines - 1] = last.trimEnd() + "…";
    return kept;
  }

  // Commentary strip: the play's commentary (its captions if it has none), typed on as it's said.
  // Bottom of the frame, or the top in tall video frames where app overlays cover the bottom.
  function drawCommentary(ctx, api, play, t, w, h, u) {
    const source = play.commentary && play.commentary.length ? play.commentary : play.captions;
    let line = null;
    for (const c of source) if (c.t <= t + 1e-6) line = c;
    if (!line) return;
    const size = 13.5 * u, lh = size * 1.35, padX = 14 * u;
    const boxW = Math.min(w - 28 * u, 600 * u);
    ctx.save();
    ctx.font = `600 ${size}px ${api.fonts.body}`;
    const lines = wrapLines(ctx, line.text, boxW - 2 * padX, 2);
    const boxH = 30 * u + lines.length * lh + 8 * u;
    const x = (w - boxW) / 2, y = h > w ? 16 * u : h - boxH - 14 * u;
    const reveal = api.reduceMotion ? 1 : clamp((t - line.t) / clamp(line.text.length * 0.022, 0.4, 1.4), 0, 1);
    let chars = Math.ceil(reveal * lines.join(" ").length);
    ctx.fillStyle = "rgba(8,12,18,0.8)";
    api.roundRect(ctx, x, y, boxW, boxH, 8 * u);
    ctx.fill();
    ctx.fillStyle = "#FFC53D";
    ctx.beginPath();
    ctx.arc(x + padX + 3 * u, y + 15 * u, 3 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `700 ${9 * u}px ${api.fonts.body}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${1.2 * u}px`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("COMMENTARY", x + padX + 11 * u, y + 15.5 * u);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 ${size}px ${api.fonts.body}`;
    lines.forEach((ln, i) => {
      const shown = ln.slice(0, Math.max(0, chars));
      chars -= ln.length + 1;
      if (shown) ctx.fillText(shown, x + padX, y + 30 * u + lh * (i + 0.5));
    });
    ctx.restore();
  }

  function draw(env) {
    const { ctx, w, h, t, R, api, live } = env;
    const play = R.play;
    let world = worlds.get(play);
    if (!world) { world = buildWorld(play, api); worlds.set(play, world); }
    const motion = !api.reduceMotion;
    const u = clamp(Math.min(w, h) / 420, 0.8, 1.7);

    // Camera: follow the ball smoothly, push in on goals
    let cx = 0, cy = 0;
    for (let k = -6; k <= 6; k++) {
      const b = R.ballAt(clamp(t + k * 0.1, 0, play.duration));
      cx += b.x / 13;
      cy += b.y / 13;
    }
    const goal = goalMoment(play, t);
    const zoom = goal && motion ? 1 + 0.4 * bump(goal.since, -1.3, 0.15, 2.4) : 1;
    const s = Math.max(w / 64, h / 64) * zoom;
    const halfW = w / 2 / s, halfH = h / 2 / s;
    cx = clampRange(cx, X0 + halfW, X0 + TW - halfW);
    cy = clampRange(cy, Y0 + halfH, Y0 + TH - halfH);
    const SX = x => w / 2 + (x - cx) * s, SY = y => h / 2 + (y - cy) * s;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(world, (cx - halfW - X0) * PXM, (cy - halfH - Y0) * PXM, 2 * halfW * PXM, 2 * halfH * PXM, 0, 0, w, h);

    // Ball route: travelled part glows
    const idx = Math.min(R.track.length - 1, Math.floor(t / 0.05));
    const ball = R.ballAt(t);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (idx > 0) {
      ctx.save();
      ctx.shadowColor = "rgba(255,197,61,0.9)";
      ctx.shadowBlur = 10 * u;
      ctx.strokeStyle = "rgba(255,214,102,0.9)";
      ctx.lineWidth = Math.max(2, 0.22 * s);
      ctx.beginPath();
      for (let i = 0; i <= idx; i++) i ? ctx.lineTo(SX(R.track[i].x), SY(R.track[i].y)) : ctx.moveTo(SX(R.track[i].x), SY(R.track[i].y));
      ctx.lineTo(SX(ball.x), SY(ball.y));
      ctx.stroke();
      ctx.restore();
    }

    // Players, back to front
    // Pose everyone from the body model; players in the air are drawn over those on the ground
    const states = play.players.map(pl => {
      const body = R.bodyAt(pl, t);
      return { pl, body, p: { x: body.x, y: body.y }, heading: body.heading };
    }).sort((a, b) => (a.p.y - b.p.y) + 100 * (Math.max(0, a.body.lift) - Math.max(0, b.body.lift)));
    for (const st of states) {
      if (!st.pl.star) continue;
      const pulse = motion ? 0.5 + 0.5 * Math.sin(t * 6) : 0.5;
      const glow = ctx.createRadialGradient(SX(st.p.x), SY(st.p.y), 0, SX(st.p.x), SY(st.p.y), 2.4 * s);
      glow.addColorStop(0, `rgba(255,197,61,${0.35 + pulse * 0.2})`);
      glow.addColorStop(1, "rgba(255,197,61,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(SX(st.p.x) - 2.4 * s, SY(st.p.y) - 2.4 * s, 4.8 * s, 4.8 * s);
      ctx.strokeStyle = "rgba(255,210,90,0.9)";
      ctx.lineWidth = Math.max(1.5, 0.12 * s);
      ctx.beginPath();
      ctx.ellipse(SX(st.p.x), SY(st.p.y), (1.05 + pulse * 0.15) * s * K, (0.8 + pulse * 0.1) * s * K, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const st of states) {
      drawPlayer(ctx, play.teams[st.pl.team], st.pl, SX(st.p.x), SY(st.p.y), st.heading, st.body, s, R.lookOf(st.pl), R.era.kit, R.bootColor(st.pl), play.venue.time);
    }

    // Ball with motion streak
    const lift = ball.h * 2.2 * s;
    const br = Math.max(3.5, 0.3 * s * K) * (1 + ball.h * 0.4);
    const prev = R.ballAt(Math.max(0, t - 0.12));
    const travel = Math.hypot(ball.x - prev.x, ball.y - prev.y);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(SX(ball.x) + 0.3 * s, SY(ball.y) + 0.25 * s, br, br * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (travel > 1.2) {
      const grad = ctx.createLinearGradient(SX(prev.x), SY(prev.y) - lift, SX(ball.x), SY(ball.y) - lift);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(1, "rgba(255,255,255,0.6)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = br * 1.5;
      ctx.beginPath();
      ctx.moveTo(SX(prev.x), SY(prev.y) - lift);
      ctx.lineTo(SX(ball.x), SY(ball.y) - lift);
      ctx.stroke();
    }
    api.drawBall(ctx, SX(ball.x), SY(ball.y) - lift, br, R.era.ball, travel > 0.2 ? t * 14 : 0);

    // Name tags
    for (const st of states) {
      const { pl } = st;
      if (!pl.name && pl.num == null) continue;
      const label = pl.name ? (pl.num != null ? `${pl.num} ${pl.name.toUpperCase()}` : pl.name.toUpperCase()) : String(pl.num);
      const tm = play.teams[pl.team];
      roundedText(ctx, api, label, SX(st.p.x), SY(st.p.y) - 1.15 * s * K - 9 * u, 10 * u,
        pl.star ? "rgba(255,197,61,0.95)" : "rgba(8,12,18,0.78)", pl.star ? "#2A1E00" : "#ffffff", pl.star ? null : tm.color);
    }

    // Goal: the net ripples
    if (goal && goal.since >= 0 && goal.since < 1.2) {
      const g0 = goal.since;
      const gb = R.ballAt(goal.ev.t);
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - g0 / 1.2)})`;
      ctx.lineWidth = Math.max(1.5, 0.12 * s);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(SX(Math.min(gb.x, 105)), SY(gb.y), (0.8 + i * 0.9 + g0 * 3) * s, -Math.PI / 2.4, Math.PI / 2.4);
        ctx.stroke();
      }
    }

    if (play.venue.time !== "night") {
      ctx.fillStyle = play.venue.time === "day" ? "rgba(255,250,235,0.06)" : "rgba(255,150,70,0.07)";
      ctx.fillRect(0, 0, w, h);
    }

    // Vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0,0,0,${{ day: 0.28, dusk: 0.4, night: 0.5 }[play.venue.time]})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    drawCommentary(ctx, api, play, t, w, h, u);

    // Scorebug on the page (videos already carry the score)
    if (live) {
      const sc = api.scoreAt(play, t);
      const text = `${play.clock ? play.clock + "  " : ""}${play.teams.A.short} ${sc[0]}–${sc[1]} ${play.teams.B.short}`;
      ctx.font = `700 ${11 * u}px ${api.fonts.body}`;
      const tw = ctx.measureText(text).width;
      roundedText(ctx, api, text, 14 * u + (tw + 12 * u) / 2, 20 * u, 11 * u, "rgba(8,12,18,0.8)", "#ffffff", null);
    }
  }

  window.BirdseyeLooks = window.BirdseyeLooks || {};
  window.BirdseyeLooks.arcade = { label: "Arcade", ready: true, draw };
})();
