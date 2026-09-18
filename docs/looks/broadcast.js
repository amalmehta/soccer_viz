// Broadcast look: TV camera high in the stands, tracking the ball across a floodlit stadium.
// A simple pinhole projection onto the pitch plane; players are drawn as running figures.
(() => {
  "use strict";
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const bump = (x, a, b, c) => (x < b ? smooth((x - a) / (b - a)) : 1 - smooth((x - b) / (c - b)));
  const SKIN = ["#8d5524", "#c68642", "#e0ac69", "#f1c27d", "#ffdbac", "#5c3a21"];
  const HAIR = ["#1b130d", "#2b1d14", "#3b2a1a", "#0e0e0e", "#6b4b2a"];
  const CROWD = ["#e8e4da", "#3a4150", "#c9ccd3", "#1d232c", "#5a6272"];

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function ih(i, j) {
    let n = Math.imul(i, 374761393) + Math.imul(j, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  let noiseTile = null;
  function noise() {
    if (noiseTile) return noiseTile;
    noiseTile = document.createElement("canvas");
    noiseTile.width = noiseTile.height = 192;
    const g = noiseTile.getContext("2d");
    const img = g.createImageData(192, 192);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return noiseTile;
  }

  function goalMoment(play, t) {
    let best = null;
    for (const ev of play.events) {
      if (ev.type !== "goal") continue;
      const since = t - ev.t;
      if (since > -1.5 && since < 3.2 && (!best || Math.abs(since) < Math.abs(best.since))) best = { since, ev };
    }
    return best;
  }

  function makeCamera(w, h, cx, ty, viewW) {
    const C = { x: cx, y: 68 + 38, z: 24 };
    let fy = ty - C.y, fz = -C.z;
    const fl = Math.hypot(fy, fz);
    fy /= fl;
    fz /= fl;
    const F = (w * fl) / viewW;
    const shift = h * (w < h ? 0.16 : 0.06);
    return {
      F,
      p(x, y, z = 0) {
        const vx = x - C.x, vy = y - C.y, vz = z - C.z;
        const d = vy * fy + vz * fz;
        const yc = vy * fz - vz * fy;
        return { x: w / 2 + (F * vx) / d, y: h / 2 + shift - (F * yc) / d, d };
      }
    };
  }

  const rectPts = (x0, y0, x1, y1, z = 0) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
  function arcPts(cx, cy, r, a0, a1, n = 40) {
    const out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0]); }
    return out;
  }
  function pathOf(ctx, cam, pts, close) {
    ctx.beginPath();
    pts.forEach(([x, y, z], i) => { const p = cam.p(x, y, z || 0); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    if (close) ctx.closePath();
  }

  const SKIES = {
    day: ["#5d9bd6", "#bcd9ef"],
    dusk: ["#1e2140", "#e58b54"],
    night: ["#04070b", "#101a24"],
    closed: ["#15181d", "#2a2f36"]
  };

  function drawStands(ctx, cam, w, h, cx, t, cheer, crowdColors, venue) {
    const [skyTop, skyLow] = SKIES[venue.roof === "closed" ? "closed" : venue.time];
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    sky.addColorStop(0, skyTop);
    sky.addColorStop(1, skyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Far stand, roof and floodlights
    ctx.fillStyle = shadeHex(venue.stands, venue.time === "day" ? 0.7 : 0.42);
    pathOf(ctx, cam, [[-45, -7, 0], [150, -7, 0], [150, -30, 19], [-45, -30, 19]], true);
    ctx.fill();
    const buckets = crowdColors.map(() => []);
    for (let r = 0; r < 30; r++) {
      const s = (r + 0.5) / 30, y = -7.6 - 22 * s, z0 = 0.8 + 18 * s;
      const d = cam.p(cx, y, z0).d;
      const half = ((w / 2 + 30) * d) / cam.F;
      const size = (cam.F * 0.46) / d;
      for (let c = Math.floor((cx - half) / 0.7); c <= Math.ceil((cx + half) / 0.7); c++) {
        const x = c * 0.7;
        if (x < -44 || x > 149 || ih(r, c) < 0.08) continue;
        const jump = cheer > 0 ? Math.max(0, Math.sin(t * 17 + ih(c, r) * 6)) * 0.35 * cheer : 0;
        const p = cam.p(x, y, z0 + jump);
        buckets[Math.floor(ih(c, r + 99) * crowdColors.length)].push(p.x - size / 2, p.y - size, size);
      }
    }
    buckets.forEach((b, k) => {
      ctx.fillStyle = crowdColors[k];
      ctx.globalAlpha = venue.time === "day" ? 0.78 : 0.55;
      ctx.beginPath();
      for (let i = 0; i < b.length; i += 3) ctx.rect(b[i], b[i + 1], b[i + 2], b[i + 2] * 1.1);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (venue.roof !== "open") {
      ctx.fillStyle = shadeHex(venue.accent, 0.3);
      pathOf(ctx, cam, [[-45, -30, 19], [150, -30, 19], [150, -22, 23.5], [-45, -22, 23.5]], true);
      ctx.fill();
    }
    if (venue.time === "day") return;
    const lamp = venue.time === "dusk" ? 0.6 : 1;
    ctx.globalCompositeOperation = "lighter";
    for (let x = -18; x <= 124; x += 22) {
      const p = cam.p(x, -22, 23.6);
      if (p.x < -200 || p.x > w + 200) continue;
      const r = (cam.F * 9) / p.d;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      glow.addColorStop(0, `rgba(255,250,235,${0.85 * lamp})`);
      glow.addColorStop(0.08, `rgba(255,248,225,${0.35 * lamp})`);
      glow.addColorStop(1, "rgba(255,248,225,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - r, p.y - r, 2 * r, 2 * r);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function drawPitch(ctx, cam, w, h, venue) {
    ctx.fillStyle = shadeHex(venue.grass, 0.62);
    pathOf(ctx, cam, rectPts(-14, -7, 119, 80), true);
    ctx.fill();
    if (venue.track) {
      // Athletics track between the pitch and the stands
      ctx.fillStyle = "#9c4a36";
      pathOf(ctx, cam, rectPts(-12, -6.8, 117, 79), true);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      for (let lane = 0; lane < 4; lane++) {
        pathOf(ctx, cam, rectPts(-11 + lane * 1.5, -6.4 + lane * 0.5, 116 - lane * 1.5, 78.5 - lane * 1.5), true);
        ctx.stroke();
      }
      ctx.fillStyle = shadeHex(venue.grass, 0.8);
      pathOf(ctx, cam, rectPts(-5.5, -4.5, 110.5, 72.5), true);
      ctx.fill();
    }
    ctx.fillStyle = venue.grass;
    pathOf(ctx, cam, rectPts(-4, -4, 109, 72), true);
    ctx.fill();
    if (venue.mowing !== "plain") {
      for (let i = 0; i < 20; i += 2) {
        ctx.fillStyle = "rgba(255,255,255,0.055)";
        pathOf(ctx, cam, rectPts(-4 + (i * 113) / 20, -4, -4 + ((i + 1) * 113) / 20, 72), true);
        ctx.fill();
      }
    }
    if (venue.mowing === "checks") {
      for (let j = 0; j < 12; j += 2) {
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        pathOf(ctx, cam, rectPts(-4, -4 + (j * 76) / 12, 109, -4 + ((j + 1) * 76) / 12), true);
        ctx.fill();
      }
    }
    ctx.save();
    pathOf(ctx, cam, rectPts(-4, -4, 109, 72), true);
    ctx.clip();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = ctx.createPattern(noise(), "repeat");
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    const far = cam.p(52.5, -4), near = cam.p(52.5, 72);
    const shade = ctx.createLinearGradient(0, far.y, 0, Math.max(near.y, far.y + 1));
    shade.addColorStop(0, `rgba(0,12,24,${venue.time === "day" ? 0.15 : 0.38})`);
    shade.addColorStop(1, "rgba(255,250,230,0.07)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    const mid = cam.p(52.5, 34);
    ctx.strokeStyle = "rgba(255,255,255,0.86)";
    ctx.lineWidth = Math.max(1, (0.13 * cam.F) / mid.d);
    ctx.lineJoin = "round";
    const line = (pts, close) => { pathOf(ctx, cam, pts, close); ctx.stroke(); };
    line(rectPts(0, 0, 105, 68), true);
    line([[52.5, 0, 0], [52.5, 68, 0]]);
    line(arcPts(52.5, 34, 9.15, 0, Math.PI * 2, 64), true);
    const arcA = Math.acos(5.5 / 9.15);
    for (const side of [0, 1]) {
      const f = x => (side ? 105 - x : x);
      line(rectPts(f(0), 13.84, f(16.5), 54.16), true);
      line(rectPts(f(0), 24.84, f(5.5), 43.16), true);
      line(side ? arcPts(94, 34, 9.15, Math.PI - arcA, Math.PI + arcA, 20) : arcPts(11, 34, 9.15, -arcA, arcA, 20));
    }

    // Far-side advertising boards with LED lettering
    ctx.fillStyle = "#0e131a";
    pathOf(ctx, cam, [[-6, -5.2, 0], [111, -5.2, 0], [111, -5.2, 0.9], [-6, -5.2, 0.9]], true);
    ctx.fill();
    ctx.fillStyle = "#FFC53D";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let x0 = -2; x0 < 106; x0 += 18) {
      const o = cam.p(x0 + 7, -5.2, 0.45), ax = cam.p(x0 + 8, -5.2, 0.45), ay = cam.p(x0 + 7, -5.2, 1.45);
      ctx.save();
      ctx.transform((ax.x - o.x) / 10, (ax.y - o.y) / 10, -(ay.x - o.x) / 10, -(ay.y - o.y) / 10, o.x, o.y);
      ctx.font = `900 7px "Big Shoulders Display", "Arial Narrow", sans-serif`;
      ctx.fillText("BIRDSEYE FC", 0, 0.4);
      ctx.restore();
    }
  }

  function drawGoal(ctx, cam, side, ripple) {
    const gx = side ? 105 : 0, back = side ? 107.2 : -2.2, dir = side ? 1 : -1;
    const bulge = y => (ripple ? dir * ripple.amp * Math.exp(-((y - ripple.y) ** 2) / 3) : 0);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 0.8;
    for (let y = 30.34; y <= 37.7; y += 0.61) {
      pathOf(ctx, cam, [[gx, y, 2.44], [back + bulge(y), y, 1.9], [back + bulge(y), y, 0]]);
      ctx.stroke();
    }
    for (let z = 0.3; z < 1.9; z += 0.4) {
      pathOf(ctx, cam, [[back, 30.34, z], ...[31.5, 33, 34, 35, 36.5].map(y => [back + bulge(y), y, z]), [back, 37.66, z]]);
      ctx.stroke();
    }
    const d = cam.p(gx, 34, 1.2).d;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(1.5, (0.14 * cam.F) / d);
    pathOf(ctx, cam, [[gx, 30.34, 0], [gx, 30.34, 2.44], [gx, 37.66, 2.44], [gx, 37.66, 0]]);
    ctx.stroke();
  }

  // Side-on footballer standing on `foot`, H px tall. g = gait from the page.
  // Run cycle per leg: the thigh swings with sin(phase); the knee folds most mid-swing (heel kick)
  // and stays soft in stance. Arms counter-swing with bent elbows; the torso leans into a sprint.
  function kitPaint(ctx, tm, gk, x, y, w, h, face) {
    ctx.fillStyle = gk ? tm.gkColor : tm.color;
    ctx.fillRect(x, y, w, h);
    if (gk || tm.pattern === "plain") return;
    ctx.fillStyle = tm.color2;
    if (tm.pattern === "stripes") {
      for (let i = 0; i < 3; i++) ctx.fillRect(x + (w * (2 * i + 0.5)) / 6, y, w / 6, h);
    } else if (tm.pattern === "hoops") {
      for (let i = 0; i < 3; i++) ctx.fillRect(x, y + (h * (2 * i + 0.5)) / 6, w, h / 6);
    } else if (tm.pattern === "halves") {
      ctx.fillRect(face > 0 ? x + w / 2 : x, y, w / 2, h);
    } else if (tm.pattern === "sash") {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w * 0.35, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w * 0.65, y + h);
      ctx.fill();
    }
  }

  // Head in profile by hairstyle, with stubble or beard; face toward `face` (+1 right, -1 left)
  function drawHeadSide(ctx, lk, H, face) {
    const cx = H * 0.012 * face, cy = -H * 0.415, r = H * 0.068, hair = lk.hairColor;
    const blob = (x, y, rr) => { ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); };
    ctx.fillStyle = hair;
    if (lk.hair === "long") {
      const x0 = cx - face * r * 1.08, x1 = cx - face * r * 0.05;
      api_round(ctx, Math.min(x0, x1), cy - r * 0.4, Math.abs(x1 - x0), r * 2.5, r * 0.4);
      ctx.fill();
    }
    if (lk.hair === "ponytail") { ctx.beginPath(); ctx.ellipse(cx - face * r * 1.3, cy + r * 0.15, r * 0.5, r * 0.26, face * 0.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = lk.skin;
    blob(cx, cy, r);
    ctx.fillStyle = hair;
    switch (lk.hair) {
      case "bald":
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        blob(cx - face * r * 0.2, cy - r * 0.55, r * 0.28);
        break;
      case "buzz":
        ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.01, Math.PI, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      case "afro":
        blob(cx - face * r * 0.3, cy - r * 0.5, r * 1.3);
        break;
      case "curly":
        for (let i = 0; i < 5; i++) { const q = Math.PI + (i * Math.PI) / 4; blob(cx + Math.cos(q) * r * 0.85, cy + Math.sin(q) * r * 0.85, r * 0.42); }
        break;
      default:
        ctx.beginPath(); ctx.arc(cx - face * r * 0.1, cy - r * 0.12, r * 1.03, Math.PI, Math.PI * 2); ctx.fill();
        blob(cx - face * r * 0.6, cy + r * 0.05, r * 0.66);
    }
    if (lk.beard !== "none") {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = lk.beard === "beard" ? 0.9 : 0.38;
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(cx + face * r * 0.3, cy + r * 0.62, r * 0.75, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // Side-on footballer standing on `foot`, H px tall, posed from the page's body model
  // (R.bodyAt): joint angles for running, kicks, lunges, slides, dives, headers and celebrations.
  function drawFigure(ctx, tm, pl, foot, H, body, lk, kit, boot) {
    H *= lk.scale;
    const skin = lk.skin;
    const face = Math.cos(body.heading) >= 0 ? 1 : -1;
    const near = face > 0 ? 0 : 1; // running right, the right side of the body faces the camera
    const thighL = 0.245 * H, shinL = 0.25 * H, upperL = 0.165 * H, foreL = 0.155 * H;
    const shirt = pl.gk ? tm.gkColor : tm.color;
    const shortsLen = Math.min(0.8, 0.45 * kit.shorts), tw = 0.1 * kit.fit;
    const hipY = -0.5 * H;
    // Big leans turn the whole body about the hips (slides, flying headers, overhead kicks); the first
    // 0.5 rad only tilts the torso. Lying down or diving brings the hips towards the grass.
    const turn = Math.sign(body.pitch) * Math.max(0, Math.abs(body.pitch) - 0.5);
    const lean = body.pitch - turn;
    const down = 0.3 * H * Math.min(1, Math.max(Math.abs(turn) / 1.2, Math.abs(body.roll) / 1.4));

    const legPose = l => {
      const knee = { x: Math.sin(l.hip) * thighL * face, y: hipY + Math.cos(l.hip) * thighL };
      const sa = l.hip - l.knee;
      return { knee, sa, ankle: { x: knee.x + Math.sin(sa) * shinL * face, y: knee.y + Math.cos(sa) * shinL } };
    };
    const drawLeg = (pose, far) => {
      const dim = c => (far ? shadeHex(c, 0.78) : c);
      ctx.lineCap = "round";
      ctx.strokeStyle = dim(skin);
      ctx.lineWidth = H * 0.085;
      ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(pose.knee.x, pose.knee.y); ctx.stroke();
      ctx.strokeStyle = dim(tm.shorts);
      ctx.lineWidth = H * 0.105;
      ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(pose.knee.x * shortsLen, hipY + (pose.knee.y - hipY) * shortsLen); ctx.stroke();
      const sx = pose.knee.x + (pose.ankle.x - pose.knee.x) * 0.18, sy = pose.knee.y + (pose.ankle.y - pose.knee.y) * 0.18;
      ctx.strokeStyle = dim(skin);
      ctx.lineWidth = H * 0.066;
      ctx.beginPath(); ctx.moveTo(pose.knee.x, pose.knee.y); ctx.lineTo(sx, sy); ctx.stroke();
      ctx.strokeStyle = dim(tm.socks);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(pose.ankle.x, pose.ankle.y); ctx.stroke();
      ctx.save();
      ctx.translate(pose.ankle.x, pose.ankle.y);
      ctx.rotate(-pose.sa * face * 0.5);
      ctx.fillStyle = far ? shadeHex(boot, 0.7) : boot;
      ctx.beginPath(); ctx.ellipse(H * 0.045 * face, H * 0.012, H * 0.075, H * 0.032, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    const drawArm = (arm, far) => {
      const shY = -0.3 * H;
      const elbow = { x: Math.sin(arm.shoulder) * upperL * face, y: shY + Math.cos(arm.shoulder) * upperL };
      const fa = arm.shoulder + arm.elbow;
      const hand = { x: elbow.x + Math.sin(fa) * foreL * face, y: elbow.y + Math.cos(fa) * foreL };
      const dim = c => (far ? shadeHex(c, 0.78) : c);
      const mx = elbow.x * 0.55, my = shY + (elbow.y - shY) * 0.55;
      ctx.lineCap = "round";
      ctx.strokeStyle = dim(shirt);
      ctx.lineWidth = H * 0.07;
      ctx.beginPath(); ctx.moveTo(0, shY); ctx.lineTo(mx, my); ctx.stroke();
      ctx.strokeStyle = dim(skin);
      ctx.lineWidth = H * 0.052;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(elbow.x, elbow.y); ctx.lineTo(hand.x, hand.y); ctx.stroke();
      ctx.fillStyle = pl.gk ? "#E9F1F7" : dim(skin);
      ctx.beginPath(); ctx.arc(hand.x, hand.y, H * (pl.gk ? 0.04 : 0.028), 0, Math.PI * 2); ctx.fill();
    };
    // Arms and torso hang from the hips and lean with the upper body
    const torsoFrame = () => { ctx.translate(0, hipY); ctx.rotate(lean * face); };

    ctx.save();
    ctx.translate(foot.x, foot.y);
    // The shadow stays on the grass, fading as the body leaves it and stretching when it lies down
    const lying = Math.min(1, Math.abs(turn) + Math.abs(body.roll) / 1.4);
    ctx.fillStyle = `rgba(0,0,0,${0.35 * Math.max(0.35, 1 - Math.max(0, body.lift) * 1.5)})`;
    ctx.beginPath();
    ctx.ellipse(H * 0.06, 0, H * (0.22 + 0.12 * body.gait.run + 0.25 * lying), H * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, -body.lift * H + down);
    ctx.translate(0, hipY);
    ctx.rotate((turn + body.roll) * face);
    ctx.translate(0, -hipY);

    const legs = body.legs.map(legPose);
    ctx.save(); torsoFrame(); drawArm(body.arms[1 - near], true); ctx.restore();
    drawLeg(legs[1 - near], true);

    ctx.save();
    torsoFrame();
    ctx.fillStyle = tm.shorts;
    api_round(ctx, -H * (tw + 0.005), -H * 0.03, H * (2 * tw + 0.01), H * (0.08 + 0.04 * kit.shorts), H * 0.03);
    ctx.fill();
    api_round(ctx, -H * tw, -H * 0.335, H * 2 * tw, H * 0.34, H * 0.05);
    ctx.save();
    ctx.clip();
    kitPaint(ctx, tm, pl.gk, -H * tw, -H * 0.335, H * 2 * tw, H * 0.34, face);
    const shadeG = ctx.createLinearGradient(-H * 0.1 * face, 0, H * 0.1 * face, 0);
    shadeG.addColorStop(0, "rgba(0,0,0,0.22)");
    shadeG.addColorStop(0.6, "rgba(0,0,0,0)");
    shadeG.addColorStop(1, "rgba(255,245,220,0.18)");
    ctx.fillStyle = shadeG;
    ctx.fillRect(-H * tw, -H * 0.335, H * 2 * tw, H * 0.34);
    ctx.restore();
    ctx.fillStyle = skin;
    ctx.fillRect(-H * 0.022, -H * 0.37, H * 0.044, H * 0.05);
    if (kit.collar) {
      // Polo collar in the trim colour
      ctx.fillStyle = pl.gk ? shadeHex(tm.gkColor, 0.7) : tm.color2;
      ctx.beginPath();
      ctx.moveTo(-H * 0.06, -H * 0.335);
      ctx.lineTo(H * 0.06, -H * 0.335);
      ctx.lineTo(H * 0.025 * face, -H * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    drawHeadSide(ctx, lk, H, face);
    ctx.restore();

    drawLeg(legs[near], false);
    ctx.save(); torsoFrame(); drawArm(body.arms[near], false); ctx.restore();
    ctx.restore();
  }

  function api_round(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function shadeHex(hex, f) {
    const c = [1, 3, 5].map(i => clamp(Math.round(parseInt(hex.slice(i, i + 2), 16) * f), 0, 255));
    return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
  }

  function pill(ctx, api, text, x, y, size, bg, fg, dot) {
    ctx.font = `700 ${size}px ${api.fonts.body}`;
    const w = ctx.measureText(text).width + size * (dot ? 1.9 : 1.2), hh = size * 1.6;
    ctx.fillStyle = bg;
    api.roundRect(ctx, x - w / 2, y - hh / 2, w, hh, 3);
    ctx.fill();
    if (dot) {
      ctx.fillStyle = dot;
      ctx.beginPath();
      ctx.arc(x - w / 2 + size * 0.75, y, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + (dot ? size * 0.35 : 0), y + 0.5);
  }

  function draw(env) {
    const { ctx, w, h, t, R, api, live } = env;
    const play = R.play;
    const motion = !api.reduceMotion;
    const u = clamp(Math.min(w, h) / 420, 0.8, 1.7);
    const goal = goalMoment(play, t);
    const cheer = goal && goal.since > 0 ? clamp(Math.min(goal.since / 0.3, (3.2 - goal.since) / 0.8), 0, 1) : 0;

    // Camera: track the smoothed ball, tilt toward its side, push in on goals
    let bx = 0, by = 0;
    for (let k = -7; k <= 7; k++) {
      const b = R.ballAt(clamp(t + k * 0.1, 0, play.duration));
      bx += b.x / 15;
      by += b.y / 15;
    }
    const zoom = goal && motion ? 1 + 0.5 * bump(goal.since, -1.3, 0.1, 2.6) : 1;
    const viewW = (48 * clamp(w / h / 1.49, 0.5, 1.25)) / zoom;
    let cx = clamp(bx, viewW / 2 - 10, 115 - viewW / 2);
    let ty = 34 + (by - 34) * 0.6;
    if (goal && motion && goal.since > 0 && goal.since < 0.5) {
      const a = (1 - goal.since / 0.5) * 0.5;
      cx += Math.sin(goal.since * 95) * a;
      ty += Math.cos(goal.since * 75) * a;
    }
    const cam = makeCamera(w, h, cx, ty, viewW);
    const crowd = [play.teams.A.color, play.teams.B.color, play.venue.stands, play.venue.accent, ...CROWD];

    drawStands(ctx, cam, w, h, cx, t, motion ? cheer : 0, crowd, play.venue);
    drawPitch(ctx, cam, w, h, play.venue);

    const ball = R.ballAt(t);
    const ripple = goal && goal.since > 0 && goal.since < 1.6
      ? { y: R.ballAt(goal.ev.t).y, amp: 0.9 * Math.sin(goal.since * 10) * Math.exp(-goal.since * 2.2) }
      : null;
    drawGoal(ctx, cam, 0, ripple && R.ballAt(goal.ev.t).x < 52.5 ? ripple : null);
    drawGoal(ctx, cam, 1, ripple && R.ballAt(goal.ev.t).x >= 52.5 ? ripple : null);

    // Travelled ball route on the grass
    const idx = Math.min(R.track.length - 1, Math.floor(t / 0.05));
    if (idx > 0) {
      ctx.save();
      ctx.shadowColor = "rgba(255,197,61,0.9)";
      ctx.shadowBlur = 8 * u;
      ctx.strokeStyle = "rgba(255,214,102,0.85)";
      ctx.lineWidth = 2.4 * u;
      ctx.lineCap = "round";
      pathOf(ctx, cam, [...R.track.slice(0, idx + 1).map(p => [p.x, p.y, 0]), [ball.x, ball.y, 0]]);
      ctx.stroke();
      ctx.restore();
    }

    // Players and ball, far to near
    const items = play.players.map(pl => {
      const body = R.bodyAt(pl, t);
      const foot = cam.p(body.x, body.y, 0);
      return { kind: "player", pl, body, foot, d: foot.d };
    });
    const ballFoot = cam.p(ball.x, ball.y, 0);
    items.push({ kind: "ball", d: ballFoot.d - 0.01 });
    items.sort((a, b) => b.d - a.d);

    for (const it of items) {
      if (it.kind === "ball") {
        const r = Math.max(2.4, (cam.F * 0.11 * 2.3) / ballFoot.d);
        const lift = cam.p(ball.x, ball.y, ball.h * 3.5 + 0.2);
        const prev = R.ballAt(Math.max(0, t - 0.1));
        const pp = cam.p(prev.x, prev.y, prev.h * 3.5 + 0.2);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.ellipse(ballFoot.x, ballFoot.y, r * 1.1, r * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        if (Math.hypot(lift.x - pp.x, lift.y - pp.y) > r * 2.5) {
          const grad = ctx.createLinearGradient(pp.x, pp.y, lift.x, lift.y);
          grad.addColorStop(0, "rgba(255,255,255,0)");
          grad.addColorStop(1, "rgba(255,255,255,0.65)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = r * 1.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(pp.x, pp.y);
          ctx.lineTo(lift.x, lift.y);
          ctx.stroke();
        }
        api.drawBall(ctx, lift.x, lift.y, r, R.era.ball, Math.hypot(lift.x - pp.x, lift.y - pp.y) > 1 ? t * 12 : 0);
        continue;
      }
      const { pl, foot } = it;
      const H = Math.max(10, (cam.F * 1.85 * 1.35) / foot.d);
      if (pl.star) {
        const pulse = motion ? 0.5 + 0.5 * Math.sin(t * 6) : 0.5;
        ctx.strokeStyle = `rgba(255,197,61,${0.55 + pulse * 0.35})`;
        ctx.lineWidth = 2.2 * u;
        ctx.beginPath();
        ctx.ellipse(foot.x, foot.y, H * (0.5 + pulse * 0.06), H * 0.14, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawFigure(ctx, play.teams[pl.team], pl, foot, H, it.body, R.lookOf(pl), R.era.kit, R.bootColor(pl));
      if (pl.name || pl.num != null) {
        const label = pl.name ? (pl.num != null ? `${pl.num} ${pl.name.toUpperCase()}` : pl.name.toUpperCase()) : String(pl.num);
        pill(ctx, api, label, foot.x, foot.y - H * 1.08 - 8 * u, 9.5 * u,
          pl.star ? "rgba(255,197,61,0.95)" : "rgba(6,10,16,0.8)", pl.star ? "#2A1E00" : "#ffffff", pl.star ? null : play.teams[pl.team].color);
      }
    }

    // Grade: vignette and film grain
    const vg = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0,0,0,${{ day: 0.3, dusk: 0.45, night: 0.55 }[play.venue.time]})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.translate(-((t * 997) % 192), -((t * 613) % 192));
    ctx.fillStyle = ctx.createPattern(noise(), "repeat");
    ctx.fillRect(0, 0, w + 192, h + 192);
    ctx.restore();

    // Broadcast graphics
    if (live) {
      const sc = api.scoreAt(play, t);
      const text = `${play.teams.A.short}  ${sc[0]}–${sc[1]}  ${play.teams.B.short}${play.clock ? "   " + play.clock : ""}`;
      ctx.font = `700 ${11 * u}px ${api.fonts.body}`;
      const tw = ctx.measureText(text).width + 12 * u * 1.2;
      pill(ctx, api, text, 14 * u + tw / 2, 22 * u, 11 * u, "rgba(6,10,16,0.85)", "#ffffff", null);
    }
  }

  window.BirdseyeLooks = window.BirdseyeLooks || {};
  window.BirdseyeLooks.broadcast = { label: "Broadcast", ready: true, draw };
})();
