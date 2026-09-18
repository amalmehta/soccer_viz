// 3D look: a real-time Three.js stadium with shadowed mannequin players and a cinematic
// camera that orbits the play and swoops behind the goal when it goes in.
// Three.js is loaded from cdnjs only when this look is picked.
(() => {
  "use strict";
  const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  const SKIN = ["#8d5524", "#c68642", "#e0ac69", "#f1c27d", "#ffdbac", "#5c3a21"];
  const HAIR = ["#1b130d", "#2b1d14", "#3b2a1a", "#0e0e0e", "#6b4b2a"];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const bump = (x, a, b, c) => (x < b ? smooth((x - a) / (b - a)) : 1 - smooth((x - b) / (c - b)));
  const lerp = (a, b, k) => a + (b - a) * k;

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

  let T = null, renderer = null, scene = null, camera = null, loading = null;
  let GEO = null, STATIC = null, built = null, tmp = null;
  const look = { label: "3D", ready: false, load, draw };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Couldn't load ${src}`));
      document.head.append(s);
    });
  }

  async function load() {
    if (look.ready) return;
    if (!loading) {
      loading = (async () => {
        if (!window.THREE) await loadScript(THREE_URL);
        T = window.THREE;
        renderer = new T.WebGLRenderer({ canvas: document.createElement("canvas"), antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(1);
        renderer.outputEncoding = T.sRGBEncoding;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = T.PCFSoftShadowMap;
        tmp = new T.Vector3();
        buildStadium();
        look.ready = true;
      })();
    }
    try { await loading; } catch (e) { loading = null; throw e; }
  }

  function canvas2d(w, h, paint) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    paint(c.getContext("2d"), w, h);
    return c;
  }
  function tex(c, ru = 1, rv = 1) {
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (ru !== 1 || rv !== 1) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(ru, rv); }
    return t;
  }

  function pitchCanvas(venue) {
    const PX = 20;
    return canvas2d(115 * PX, 78 * PX, g => {
      g.setTransform(PX, 0, 0, PX, 5 * PX, 5 * PX);
      g.fillStyle = venue.grass;
      g.fillRect(-5, -5, 115, 78);
      if (venue.mowing !== "plain") {
        for (let i = 0; i < 22; i += 2) { g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(-5 + (i * 115) / 22, -5, 115 / 22, 78); }
      }
      if (venue.mowing === "checks") {
        for (let j = 0; j < 14; j += 2) { g.fillStyle = "rgba(0,0,0,0.07)"; g.fillRect(-5, -5 + (j * 78) / 14, 115, 78 / 14); }
      }
      for (let i = 0; i < 30000; i++) {
        g.fillStyle = ih(i, 1) < 0.5 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.05)";
        g.fillRect(-5 + ih(i, 2) * 115, -5 + ih(i, 3) * 78, 0.06 + ih(i, 4) * 0.14, 0.06 + ih(i, 5) * 0.14);
      }
      for (const gx of [6, 99]) {
        const wear = g.createRadialGradient(gx, 34, 0, gx, 34, 9);
        wear.addColorStop(0, "rgba(150,130,70,0.25)");
        wear.addColorStop(1, "rgba(150,130,70,0)");
        g.fillStyle = wear;
        g.fillRect(gx - 9, 25, 18, 18);
      }
      g.strokeStyle = "rgba(255,255,255,0.92)";
      g.fillStyle = "rgba(255,255,255,0.92)";
      g.lineWidth = 0.13;
      const arc = (x, y, r, a0, a1) => { g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); };
      g.strokeRect(0, 0, 105, 68);
      g.beginPath(); g.moveTo(52.5, 0); g.lineTo(52.5, 68); g.stroke();
      arc(52.5, 34, 9.15, 0, Math.PI * 2);
      const arcA = Math.acos(5.5 / 9.15);
      for (const side of [0, 1]) {
        const f = x => (side ? 105 - x : x);
        g.strokeRect(Math.min(f(0), f(16.5)), 13.84, 16.5, 40.32);
        g.strokeRect(Math.min(f(0), f(5.5)), 24.84, 5.5, 18.32);
        g.beginPath(); g.arc(f(11), 34, 0.22, 0, Math.PI * 2); g.fill();
        if (side) arc(94, 34, 9.15, Math.PI - arcA, Math.PI + arcA); else arc(11, 34, 9.15, -arcA, arcA);
      }
      g.beginPath(); g.arc(52.5, 34, 0.22, 0, Math.PI * 2); g.fill();
    });
  }

  function quad(p0, p1, p2, p3, material) {
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute([...p0, ...p1, ...p2, ...p3], 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    const a = new T.Vector3(...p1).sub(new T.Vector3(...p0));
    const b = new T.Vector3(...p3).sub(new T.Vector3(...p0));
    const n = a.cross(b);
    const toPitch = new T.Vector3(-p0[0], 5 - p0[1], -p0[2]);
    geo.setIndex(n.dot(toPitch) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
    geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, material);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function buildStadium() {
    scene = new T.Scene();
    scene.background = new T.Color(0x04070b);
    scene.fog = new T.Fog(0x070b10, 120, 280);
    camera = new T.PerspectiveCamera(40, 16 / 9, 0.5, 700);

    const hemi = new T.HemisphereLight(0xbfd4ff, 0x0b1a0f, 0.6);
    scene.add(hemi);
    const sun = new T.DirectionalLight(0xfff1dc, 1.2);
    sun.position.set(-45, 90, 40);
    sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 50, bottom: -50, near: 10, far: 260 });
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0006;
    scene.add(sun);
    const fill = new T.DirectionalLight(0xdfe8ff, 0.4);
    fill.position.set(50, 60, -40);
    scene.add(fill);

    const apron = new T.Mesh(new T.PlaneGeometry(200, 160), new T.MeshStandardMaterial({ color: 0x143820, roughness: 1 }));
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.03;
    apron.receiveShadow = true;
    scene.add(apron);
    const pitchMat = new T.MeshStandardMaterial({ map: null, roughness: 0.95 });
    const pitch = new T.Mesh(new T.PlaneGeometry(115, 78), pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.receiveShadow = true;
    scene.add(pitch);

    // Stands packed with crowd, facing the pitch
    const crowd = canvas2d(1024, 512, (g, w, h) => {
      g.fillStyle = "#0b0f15";
      g.fillRect(0, 0, w, h);
      const cols = ["#e8e4da", "#3a4150", "#c9ccd3", "#1d232c", "#5a6272", "#a50044", "#1d2b6b", "#f4f4ef"];
      for (let y = 6; y < h; y += 12) {
        g.fillStyle = "rgba(0,0,0,0.5)";
        g.fillRect(0, y + 5, w, 3);
        for (let x = 4; x < w; x += 9) {
          if (ih(x, y) < 0.1) continue;
          g.fillStyle = cols[Math.floor(ih(y, x) * cols.length)];
          g.fillRect(x, y - 3, 6, 8);
        }
      }
    });
    const standMat = new T.MeshStandardMaterial({ map: tex(crowd, 10, 3), roughness: 1 });
    quad([-78, 0.8, -42], [78, 0.8, -42], [78, 21, -67], [-78, 21, -67], standMat);
    quad([78, 0.8, 42], [-78, 0.8, 42], [-78, 21, 67], [78, 21, 67], standMat);
    quad([61, 0.8, 52], [61, 0.8, -52], [85, 21, -52], [85, 21, 52], standMat);
    quad([-61, 0.8, -52], [-61, 0.8, 52], [-85, 21, 52], [-85, 21, -52], standMat);
    const roofMat = new T.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.8 });
    for (const [x, z, sx, sz] of [[0, -63, 160, 14], [73, 0, 14, 110], [-73, 0, 14, 110]]) {
      const roof = new T.Mesh(new T.BoxGeometry(sx, 0.8, sz), roofMat);
      roof.position.set(x, 25, z);
      scene.add(roof);
    }

    // LED boards
    const board = canvas2d(512, 64, (g, w, h) => {
      g.fillStyle = "#0e131a";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#FFC53D";
      g.font = `900 46px "Big Shoulders Display", "Arial Narrow", sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("BIRDSEYE FC", w / 2, h / 2 + 2);
    });
    const boardMatLong = new T.MeshBasicMaterial({ map: tex(board, 7, 1) });
    const boardMatShort = new T.MeshBasicMaterial({ map: tex(board.cloneNode ? board : board, 1, 1) });
    for (const z of [-38.6, 38.6]) {
      const b = new T.Mesh(new T.BoxGeometry(116, 0.9, 0.15), boardMatLong);
      b.position.set(0, 0.45, z);
      scene.add(b);
    }
    for (const x of [-57, 57]) {
      for (const z of [-22, 22]) {
        const b = new T.Mesh(new T.BoxGeometry(0.15, 0.9, 26), boardMatShort);
        b.position.set(x, 0.45, z);
        scene.add(b);
      }
    }

    // Floodlight towers with glow
    const glowTex = tex(canvas2d(128, 128, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, "rgba(255,250,235,1)");
      gr.addColorStop(0.15, "rgba(255,245,220,0.55)");
      gr.addColorStop(1, "rgba(255,245,220,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    }));
    const towerMat = new T.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.7 });
    const lampMat = new T.MeshBasicMaterial({ color: 0xfff6e0 });
    const glows = [];
    for (const [x, z] of [[-70, -55], [70, -55], [-70, 55], [70, 55]]) {
      const tower = new T.Mesh(new T.BoxGeometry(1.2, 44, 1.2), towerMat);
      tower.position.set(x, 22, z);
      scene.add(tower);
      const lamp = new T.Mesh(new T.BoxGeometry(9, 4, 0.6), lampMat);
      lamp.position.set(x * 0.97, 45, z * 0.97);
      lamp.lookAt(0, 0, 0);
      scene.add(lamp);
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
      glow.position.copy(lamp.position);
      glow.scale.set(34, 34, 1);
      scene.add(glow);
      glows.push(glow);
    }

    // Goals with nets
    const netTex = canvas2d(128, 128, (g, w) => {
      g.strokeStyle = "rgba(255,255,255,0.9)";
      g.lineWidth = 3;
      for (let i = 0; i <= w; i += 16) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i, w); g.stroke();
        g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke();
      }
    });
    const netMat = new T.MeshBasicMaterial({ map: tex(netTex, 6, 2), transparent: true, opacity: 0.5, side: T.DoubleSide, depthWrite: false });
    const postMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const nets = {};
    for (const side of [-1, 1]) {
      const gx = side * 52.5;
      for (const z of [-3.66, 3.66]) {
        const post = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 2.44, 10), postMat);
        post.position.set(gx, 1.22, z);
        post.castShadow = true;
        scene.add(post);
      }
      const bar = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 7.44, 10), postMat);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(gx, 2.44, 0);
      bar.castShadow = true;
      scene.add(bar);
      const back = new T.Mesh(new T.PlaneGeometry(7.32, 2.1), netMat);
      back.position.set(gx + side * 2.2, 1.05, 0);
      back.rotation.y = Math.PI / 2;
      scene.add(back);
      const roofNet = new T.Mesh(new T.PlaneGeometry(2.25, 7.32), netMat);
      roofNet.position.set(gx + side * 1.1, 2.27, 0);
      roofNet.rotation.set(-Math.PI / 2, side * 0.15, 0);
      scene.add(roofNet);
      for (const z of [-3.66, 3.66]) {
        const sideNet = new T.Mesh(new T.PlaneGeometry(2.2, 2.44), netMat);
        sideNet.position.set(gx + side * 1.1, 1.22, z);
        scene.add(sideNet);
      }
      nets[side] = back;
    }

    GEO = {
      torso: new T.CylinderGeometry(0.22, 0.17, 0.62, 14),
      shorts: new T.CylinderGeometry(0.18, 0.2, 0.24, 12),
      leg: new T.CylinderGeometry(0.075, 0.06, 0.84, 10),
      arm: new T.CylinderGeometry(0.055, 0.045, 0.56, 8),
      head: new T.SphereGeometry(0.13, 16, 12),
      hair: new T.SphereGeometry(0.137, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      boot: new T.BoxGeometry(0.26, 0.08, 0.11),
      ball: new T.SphereGeometry(0.24, 24, 16),
      ring: new T.RingGeometry(1.25, 1.55, 48)
    };
    const ballTex = tex(canvas2d(256, 128, (g, w, h) => {
      g.fillStyle = "#f7f7f5";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#15191e";
      for (let i = 0; i < 12; i++) {
        g.beginPath();
        g.arc((i % 6) * (w / 6) + (i >= 6 ? w / 12 : 0) + 10, i >= 6 ? h * 0.72 : h * 0.28, 11, 0, Math.PI * 2);
        g.fill();
      }
    }));
    // Athletics track under the pitch edge, and a roof for closed stadiums; shown per venue
    const track = new T.Mesh(new T.PlaneGeometry(132, 96), new T.MeshStandardMaterial({ color: new T.Color("#9c4a36").convertSRGBToLinear(), roughness: 1 }));
    track.rotation.x = -Math.PI / 2;
    track.position.y = -0.015;
    track.receiveShadow = true;
    scene.add(track);
    const dome = new T.Mesh(new T.PlaneGeometry(190, 150), new T.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.9, side: T.DoubleSide }));
    dome.rotation.x = Math.PI / 2;
    dome.position.y = 34;
    scene.add(dome);

    STATIC = {
      nets, glows, hemi, sun, fill, pitchMat, standMat, roofMat, track, dome, pitchTextures: new Map(),
      bootMat: new T.MeshStandardMaterial({ color: 0x111418, roughness: 0.5 }),
      ballMat: new T.MeshStandardMaterial({ map: ballTex, roughness: 0.35 })
    };
  }

  const readableOn = hex => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.55 ? "#12201A" : "#FFFFFF";
  };

  // Shirt texture wrapped round the torso cylinder: u 0.25 is the chest, u 0.75 the back
  function kitTexture(tm, pl) {
    return canvas2d(256, 128, (g, w, h) => {
      const base = pl.gk ? tm.gkColor : tm.color;
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      if (!pl.gk && tm.pattern !== "plain") {
        g.fillStyle = tm.color2;
        if (tm.pattern === "stripes") for (let i = 0; i < 8; i++) g.fillRect((w * (2 * i + 0.5)) / 16, 0, w / 16, h);
        else if (tm.pattern === "hoops") for (let i = 0; i < 4; i++) g.fillRect(0, (h * (2 * i + 0.5)) / 8, w, h / 8);
        else if (tm.pattern === "halves") g.fillRect(0, 0, w / 2, h);
        else if (tm.pattern === "sash") {
          g.beginPath();
          g.moveTo(w * 0.08, 0); g.lineTo(w * 0.2, 0); g.lineTo(w * 0.42, h); g.lineTo(w * 0.3, h);
          g.fill();
        }
      }
      g.fillStyle = pl.gk ? "rgba(0,0,0,0.3)" : tm.color2;
      g.fillRect(0, 0, w, 7);
      if (pl.num != null) {
        g.font = `900 72px "Big Shoulders Display", "Arial Narrow", sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.lineJoin = "round";
        g.lineWidth = 7;
        g.strokeStyle = "rgba(0,0,0,0.35)";
        g.strokeText(String(pl.num), w * 0.75, h * 0.56);
        g.fillStyle = pl.gk ? readableOn(base) : tm.text;
        g.fillText(String(pl.num), w * 0.75, h * 0.56);
      }
    });
  }

  function applyVenue(venue) {
    const day = venue.time === "day", dusk = venue.time === "dusk", closed = venue.roof === "closed";
    scene.background.setHex(closed ? 0x15181d : day ? 0x86b6e0 : dusk ? 0x3a3450 : 0x04070b);
    scene.fog.color.setHex(closed ? 0x15181d : day ? 0x9cc3e6 : dusk ? 0x4a3a4a : 0x070b10);
    STATIC.hemi.intensity = day ? 0.95 : dusk ? 0.7 : 0.6;
    STATIC.hemi.color.setHex(day ? 0xdfeeff : dusk ? 0xffd2b0 : 0xbfd4ff);
    STATIC.sun.intensity = day ? 1.5 : dusk ? 1.0 : 1.2;
    STATIC.sun.color.setHex(day ? 0xfff6e8 : dusk ? 0xffb27a : 0xfff1dc);
    STATIC.sun.position.set(day ? -60 : -45, day ? 110 : dusk ? 35 : 90, day ? 70 : 40); // low sun at dusk
    STATIC.glows.forEach(g => { g.visible = !day; g.material.opacity = dusk ? 0.6 : 1; });
    STATIC.standMat.color.setRGB(1, 1, 1).lerp(new T.Color(venue.stands).convertSRGBToLinear(), 0.55);
    STATIC.roofMat.color.set(venue.accent).convertSRGBToLinear().multiplyScalar(0.5);
    STATIC.track.visible = venue.track;
    STATIC.dome.visible = closed;
    const key = venue.grass + venue.mowing;
    if (!STATIC.pitchTextures.has(key)) STATIC.pitchTextures.set(key, tex(pitchCanvas(venue)));
    STATIC.pitchMat.map = STATIC.pitchTextures.get(key);
    STATIC.pitchMat.needsUpdate = true;
  }

  function buildPlay(play, R, api) {
    applyVenue(play.venue);
    // The era's ball design
    if (STATIC.ballMat.map) STATIC.ballMat.map.dispose();
    STATIC.ballMat.map = tex(canvas2d(256, 128, (g, w, h) => api.paintBallTexture(g, w, h, R.era.ball)));
    STATIC.ballMat.needsUpdate = true;
    if (built) {
      scene.remove(built.group);
      built.mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
    }
    if (!GEO.thigh) {
      Object.assign(GEO, {
        shirt: new T.CylinderGeometry(0.2, 0.165, 0.56, 16),
        shortsBody: new T.CylinderGeometry(0.17, 0.185, 0.24, 14),
        shortsLeg: new T.CylinderGeometry(0.1, 0.09, 0.2, 10),
        thigh: new T.CylinderGeometry(0.078, 0.06, 0.44, 10),
        shin: new T.CylinderGeometry(0.058, 0.042, 0.44, 10),
        upperArm: new T.CylinderGeometry(0.058, 0.05, 0.3, 8),
        forearm: new T.CylinderGeometry(0.045, 0.036, 0.27, 8),
        neck: new T.CylinderGeometry(0.05, 0.055, 0.1, 8),
        hand: new T.SphereGeometry(0.045, 8, 6),
        glove: new T.SphereGeometry(0.068, 8, 6),
        hairBack: new T.BoxGeometry(0.08, 0.3, 0.25),
        tail: new T.CylinderGeometry(0.035, 0.02, 0.22, 8),
        beard: new T.SphereGeometry(0.118, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
        collar: new T.CylinderGeometry(0.105, 0.13, 0.06, 14, 1, true)
      });
      STATIC.gloveMat = new T.MeshStandardMaterial({ color: new T.Color("#E9F1F7").convertSRGBToLinear(), roughness: 0.7 });
    }
    const playGroup = new T.Group();
    const mats = [];
    const std = (color, roughness = 0.65) => {
      // Kit hex colours are sRGB; the renderer works in linear space
      const m = new T.MeshStandardMaterial({ color: new T.Color(color).convertSRGBToLinear(), roughness });
      mats.push(m);
      return m;
    };
    const kits = {};
    for (const side of ["A", "B"]) {
      const tm = play.teams[side];
      kits[side] = { shorts: std(tm.shorts), socks: std(tm.socks), sleeve: std(tm.color, 0.6), sleeveGk: std(tm.gkColor, 0.6), collar: std(tm.color2, 0.6) };
    }

    const players = [];
    for (const pl of play.players) {
      const tm = play.teams[pl.team], kit = kits[pl.team], cut = R.era.kit;
      const bootMat = std(R.bootColor(pl), 0.45);
      const lk = R.lookOf(pl);
      const skin = std(lk.skin, 0.8), hair = std(lk.hairColor, 0.9);
      const shirt = new T.MeshStandardMaterial({ map: tex(kitTexture(tm, pl)), roughness: 0.6 });
      mats.push(shirt);
      const root = new T.Group(), body = new T.Group(), torso = new T.Group();
      root.add(body);
      const mesh = (geo, mat, x, y, z, parent) => {
        const m = new T.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        parent.add(m);
        return m;
      };
      const joint = (x, y, z, parent) => { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g; };

      const pelvis = joint(0, 0.95, 0, body);
      mesh(GEO.shortsBody, kit.shorts, 0, -0.02, 0, pelvis);
      const legs = [];
      for (const side of [-1, 1]) {
        const hip = joint(0, -0.08, side * 0.1, pelvis);
        mesh(GEO.shortsLeg, kit.shorts, 0, -0.1 * cut.shorts, 0, hip).scale.set(1, cut.shorts, 1);
        mesh(GEO.thigh, skin, 0, -0.22, 0, hip);
        const knee = joint(0, -0.44, 0, hip);
        mesh(GEO.shin, kit.socks, 0, -0.22, 0, knee);
        mesh(GEO.boot, bootMat, 0.07, -0.45, 0, knee);
        legs.push({ side, hip, knee });
      }
      torso.position.set(0, 1.0, 0);
      body.add(torso);
      mesh(GEO.shirt, shirt, 0, 0.28, 0, torso).scale.set(cut.fit, 1, cut.fit);
      if (cut.collar) mesh(GEO.collar, kit.collar, 0, 0.555, 0, torso);
      mesh(GEO.neck, skin, 0, 0.6, 0, torso);
      mesh(GEO.head, skin, 0.02, 0.76, 0, torso);
      // Hair by style, then stubble or beard over the jaw
      const headY = 0.76;
      if (lk.hair !== "bald") {
        const cap = mesh(GEO.hair, hair, 0, headY + 0.03, 0, torso);
        if (lk.hair === "buzz") cap.scale.set(0.98, 0.7, 0.98);
        if (lk.hair === "curly") cap.scale.set(1.14, 1.2, 1.14);
      }
      if (lk.hair === "afro") mesh(GEO.head, hair, -0.03, headY + 0.08, 0, torso).scale.set(1.55, 1.35, 1.55);
      if (lk.hair === "long") mesh(GEO.hairBack, hair, -0.1, headY - 0.1, 0, torso);
      if (lk.hair === "ponytail") mesh(GEO.tail, hair, -0.17, headY - 0.03, 0, torso).rotation.z = 0.7;
      if (lk.beard !== "none") {
        let beardMat = hair;
        if (lk.beard === "stubble") {
          beardMat = std(lk.hairColor, 0.95);
          beardMat.transparent = true;
          beardMat.opacity = 0.45;
        }
        mesh(GEO.beard, beardMat, 0.035, headY - 0.01, 0, torso).scale.set(0.95, 0.9, 0.95);
      }
      const arms = [];
      for (const side of [-1, 1]) {
        const shoulder = joint(0, 0.52, side * 0.26, torso);
        mesh(GEO.upperArm, pl.gk ? kit.sleeveGk : kit.sleeve, 0, -0.15, 0, shoulder);
        const elbow = joint(0, -0.3, 0, shoulder);
        mesh(GEO.forearm, skin, 0, -0.135, 0, elbow);
        mesh(pl.gk ? GEO.glove : GEO.hand, pl.gk ? STATIC.gloveMat : skin, 0, -0.29, 0, elbow);
        arms.push({ side, shoulder, elbow });
      }
      root.scale.setScalar(1.2 * lk.scale);
      playGroup.add(root);
      players.push({ pl, root, body, torso, legs, arms });
    }

    const ball = new T.Mesh(GEO.ball, STATIC.ballMat);
    ball.castShadow = true;
    playGroup.add(ball);
    const ringMat = new T.MeshBasicMaterial({ color: 0xffc53d, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false });
    mats.push(ringMat);
    const ring = new T.Mesh(GEO.ring, ringMat);
    ring.rotation.x = -Math.PI / 2;
    playGroup.add(ring);
    scene.add(playGroup);
    built = { play, group: playGroup, mats, players, ball, ring };
  }

  function goalMoment(play, t) {
    let best = null;
    for (const ev of play.events) {
      if (ev.type !== "goal") continue;
      const since = t - ev.t;
      if (since > -1.6 && since < 3.2 && (!best || Math.abs(since) < Math.abs(best.since))) best = { since, ev };
    }
    return best;
  }

  function pill(ctx, api, text, x, y, size, bg, fg, dot) {
    ctx.font = `700 ${size}px ${api.fonts.body}`;
    const w = ctx.measureText(text).width + size * (dot ? 1.9 : 1.2), hh = size * 1.6;
    ctx.fillStyle = bg;
    api.roundRect(ctx, x - w / 2, y - hh / 2, w, hh, hh / 2);
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
    if (!built || built.play !== play) buildPlay(play, R, api);

    const dev = ctx.getTransform().a || 1;
    const pw = Math.round(Math.min(w * dev, 2400)), ph = Math.round(Math.min(h * dev, 2400));
    const size = renderer.getSize(new T.Vector2());
    if (size.x !== pw || size.y !== ph) renderer.setSize(pw, ph, false);

    // Pose players and ball
    const ball = R.ballAt(t);
    let star = null;
    // Pose every player from the page's body model (R.bodyAt): running, kicks, lunges, slides, dives,
    // headers, overhead kicks and celebrations all come through the same joint angles
    for (const rig of built.players) {
      const b = R.bodyAt(rig.pl, t);
      rig.root.position.set(b.x - 52.5, 0, b.y - 34);
      rig.root.rotation.y = -b.heading;
      // Big leans turn the whole body about the hips; the first 0.5 rad only tilts the torso.
      // Rotations happen at the feet, so shift the body to keep the hips in place, then drop them
      // towards the grass when lying down or diving.
      const hipH = 0.95, height = 1.87;
      const turn = Math.sign(b.pitch) * Math.max(0, Math.abs(b.pitch) - 0.5);
      const lean = b.pitch - turn;
      const down = 0.3 * height * Math.min(1, Math.max(Math.abs(turn) / 1.2, Math.abs(b.roll) / 1.4));
      rig.body.rotation.set(b.roll, 0, -turn);
      rig.body.position.set(
        -hipH * Math.sin(turn),
        b.lift * height + hipH * (1 - Math.cos(turn)) + hipH * (1 - Math.cos(b.roll)) - down,
        -hipH * Math.sin(b.roll)
      );
      rig.torso.rotation.set(0, 0.15 * Math.sin(b.gait.phase) * b.gait.run, -lean);
      for (const leg of rig.legs) {
        const l = b.legs[leg.side > 0 ? 0 : 1];
        leg.hip.rotation.z = l.hip;
        leg.knee.rotation.z = -l.knee;
      }
      for (const arm of rig.arms) {
        const s = b.arms[arm.side > 0 ? 0 : 1];
        arm.shoulder.rotation.z = s.shoulder;
        arm.elbow.rotation.z = s.elbow;
      }
      if (rig.pl.star) star = { x: b.x, y: b.y };
    }
    const prevBall = R.ballAt(Math.max(0, t - 0.05));
    const moving = Math.hypot(ball.x - prevBall.x, ball.y - prevBall.y) > 0.02;
    built.ball.position.set(ball.x - 52.5, 0.24 + ball.h * 3.5, ball.y - 34);
    built.ball.rotation.set(0, 0, moving ? -t * 9 : 0);
    built.ring.visible = !!star;
    if (star) {
      built.ring.position.set(star.x - 52.5, 0.04, star.y - 34);
      built.ring.scale.setScalar(motion ? 1 + 0.08 * Math.sin(t * 6) : 1);
    }

    // Net ripple and floodlight pulse on goals
    const goal = goalMoment(play, t);
    for (const side of [-1, 1]) STATIC.nets[side].position.x = side * (52.5 + 2.2);
    if (goal && goal.since > 0 && goal.since < 1.6 && motion) {
      const gx = R.ballAt(goal.ev.t).x >= 52.5 ? 1 : -1;
      STATIC.nets[gx].position.x += gx * 0.9 * Math.sin(goal.since * 10) * Math.exp(-goal.since * 2.2);
    }
    const cheer = goal && goal.since > 0 ? clamp(Math.min(goal.since / 0.3, (3.2 - goal.since) / 0.8), 0, 1) : 0;
    STATIC.glows.forEach(g => g.scale.set(34, 34, 1));

    // Camera: slow orbit around the smoothed ball, swoop behind the net on goals
    let bx = 0, by = 0;
    for (let k = -7; k <= 7; k++) {
      const b = R.ballAt(clamp(t + k * 0.1, 0, play.duration));
      bx += b.x / 15;
      by += b.y / 15;
    }
    const tall = w < h;
    const orbit = -0.3 + (motion ? 0.24 * Math.sin(t * 0.22) : 0);
    const dist = tall ? 30 : 27, height = tall ? 18 : 13.5;
    let px = bx - 52.5 + Math.sin(orbit) * dist, py = height, pz = by - 34 + Math.cos(orbit) * dist;
    let lx = bx - 52.5, ly = 0.8, lz = by - 34;
    const k = goal ? bump(goal.since, -1.5, 0.15, 2.9) : 0;
    if (k > 0) {
      const gb = R.ballAt(goal.ev.t);
      const side = gb.x >= 52.5 ? 1 : -1;
      const kk = motion ? k : Math.min(k, 0.6);
      px = lerp(px, side * 58.5, kk);
      py = lerp(py, 2.6, kk);
      pz = lerp(pz, (gb.y - 34) * 0.35 + 3, kk);
      lx = lerp(lx, side * 44, kk);
      ly = lerp(ly, 1.1, kk);
      lz = lerp(lz, gb.y - 34, kk);
    }
    if (goal && motion && goal.since > 0 && goal.since < 0.5) {
      const a = (1 - goal.since / 0.5) * 0.12;
      px += Math.sin(goal.since * 90) * a;
      py += Math.cos(goal.since * 70) * a;
    }
    camera.aspect = w / h;
    camera.fov = tall ? 60 : 38;
    camera.updateProjectionMatrix();
    camera.position.set(px, py, pz);
    camera.lookAt(lx, ly, lz);

    renderer.render(scene, camera);
    ctx.drawImage(renderer.domElement, 0, 0, w, h);

    // 2D overlays projected from the scene
    const toScreen = (x, y, hgt) => {
      tmp.set(x - 52.5, hgt, y - 34).project(camera);
      return tmp.z > 1 ? null : { x: ((tmp.x + 1) / 2) * w, y: ((1 - tmp.y) / 2) * h };
    };
    const idx = Math.min(R.track.length - 1, Math.floor(t / 0.05));
    if (idx > 0) {
      ctx.save();
      ctx.shadowColor = "rgba(255,197,61,0.9)";
      ctx.shadowBlur = 8 * u;
      ctx.strokeStyle = "rgba(255,214,102,0.8)";
      ctx.lineWidth = 2.2 * u;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= idx; i++) {
        const s = toScreen(R.track[i].x, R.track[i].y, 0.05);
        if (!s) { started = false; continue; }
        if (started) ctx.lineTo(s.x, s.y); else { ctx.moveTo(s.x, s.y); started = true; }
      }
      ctx.stroke();
      ctx.restore();
    }
    for (const rig of built.players) {
      const { pl } = rig;
      if (!pl.name && pl.num == null) continue;
      const s = toScreen(rig.root.position.x + 52.5, rig.root.position.z + 34, 2.75);
      if (!s || s.x < -40 || s.x > w + 40 || s.y < -20 || s.y > h + 20) continue;
      const label = pl.name ? (pl.num != null ? `${pl.num} ${pl.name.toUpperCase()}` : pl.name.toUpperCase()) : String(pl.num);
      pill(ctx, api, label, s.x, s.y - 6 * u, 9.5 * u,
        pl.star ? "rgba(255,197,61,0.95)" : "rgba(6,10,16,0.78)", pl.star ? "#2A1E00" : "#ffffff", pl.star ? null : play.teams[pl.team].color);
    }

    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    if (live) {
      const sc = api.scoreAt(play, t);
      const text = `${play.teams.A.short}  ${sc[0]}–${sc[1]}  ${play.teams.B.short}${play.clock ? "   " + play.clock : ""}`;
      ctx.font = `700 ${11 * u}px ${api.fonts.body}`;
      const tw = ctx.measureText(text).width + 13 * u;
      pill(ctx, api, text, 14 * u + tw / 2, 22 * u, 11 * u, "rgba(6,10,16,0.85)", "#ffffff", null);
    }
  }

  window.BirdseyeLooks = window.BirdseyeLooks || {};
  window.BirdseyeLooks.stadium3d = look;
})();
