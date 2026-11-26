// A commentator worth listening to.
//
// The Web Speech API hands you whatever voices the machine happens to have, and on most machines
// those are the old concatenative ones. You can set rate, pitch and volume and nothing else, and on
// several engines pitch only resamples the output — it makes the voice smaller, not more excited.
// No amount of driving those three knobs produces a commentator, which is why this page's delivery
// code, which does drive them carefully, still sounds like a reading.
//
// So the voice is replaced rather than coaxed. Kokoro is an 82-million-parameter model built on the
// ideas in StyleTTS 2, Apache licensed, and small enough to run in the page itself through
// Transformers.js — WebGPU where it exists and WebAssembly where it does not. Nothing is sent
// anywhere: the model is fetched once, cached by the browser, and every line is synthesised on the
// machine that is listening.
//
// It is entirely optional. It costs a download of about eighty megabytes the first time, so it is
// never loaded unless asked for, and if anything at all goes wrong the page falls back to the
// system voice it has always used.
(() => {
  "use strict";

  const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
  const CDN = "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";
  // British male voices, which is what this commentary is written for
  const VOICES = [
    { id: "bm_george", label: "George · neural" },
    { id: "bm_lewis", label: "Lewis · neural" },
    { id: "bm_daniel", label: "Daniel · neural" },
    { id: "bm_fable", label: "Fable · neural" },
    { id: "bf_emma", label: "Emma · neural" }
  ];

  let tts = null, loading = null, ac = null, playing = null;
  const cache = new Map();          // text + voice + speed -> AudioBuffer

  const context = () => {
    if (!ac) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ac = Ctx ? new Ctx() : null;
    }
    return ac;
  };

  // WebGPU is several times faster but is not everywhere; the WASM build is the fallback and still
  // renders a line of commentary in a fraction of the time it takes to say it.
  async function load(onStatus) {
    if (tts) return tts;
    if (loading) return loading;
    loading = (async () => {
      onStatus && onStatus("Fetching the voice…");
      const { KokoroTTS } = await import(/* webpackIgnore: true */ CDN);
      const webgpu = !!navigator.gpu;
      onStatus && onStatus(webgpu ? "Loading the model…" : "Loading the model (no WebGPU here)…");
      try {
        tts = await KokoroTTS.from_pretrained(MODEL, { dtype: webgpu ? "fp32" : "q8", device: webgpu ? "webgpu" : "wasm" });
      } catch (e) {
        // A WebGPU that exists but will not build the model is worse than one that is absent
        tts = await KokoroTTS.from_pretrained(MODEL, { dtype: "q8", device: "wasm" });
      }
      onStatus && onStatus("");
      return tts;
    })();
    try { return await loading; } finally { loading = null; }
  }

  // ---------- Putting the voice on a microphone ----------
  //
  // The model is the best browser text-to-speech there is, and it still does not sound like a man
  // calling a goal, for a reason that has nothing to do with the model. Measured on the Istanbul
  // call -- "GERRARD! Up above them all" -- what comes out peaks at 0.13 of full scale with a crest
  // factor of 16.9 dB. That is a quiet, completely unprocessed read. A commentator is the opposite
  // of that in every respect: eight inches from a cardioid in a shouting stadium, through a desk
  // that compresses him hard so he stays intelligible over the noise, and into a room he is audibly
  // sitting in. Dry speech laid on top of a crowd bed does not sound like a man at a match; it
  // sounds like two recordings that have never met.
  //
  // So the rendered line goes through the chain the voice would really have passed through:
  //
  //   rumble out  ->  mud cut  ->  presence lift  ->  compressor  ->  drive  ->  room  ->  level
  //
  // The presence lift around 3 kHz is the one doing most of the work -- that band is what carries
  // consonants through crowd noise, and it is exactly what a commentary desk pushes. The drive is
  // soft saturation, scaled by how hard the line is being called: a voice pushed into a microphone
  // distorts a little, and that distortion is most of what "shouting" sounds like. The room is a
  // short synthetic decay, kept low, so the commentator and the crowd share a building.
  const ROOM_SECONDS = 0.55, CEILING = 0.89;
  let roomIR = null;

  function room(ctx) {
    if (roomIR && roomIR.sampleRate === ctx.sampleRate) return roomIR;
    const n = Math.round(ctx.sampleRate * ROOM_SECONDS);
    roomIR = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = roomIR.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const decay = Math.pow(1 - i / n, 2.6);
        // Low-passed noise: a big enclosure soaks up the top end long before the bottom
        lp += ((Math.random() * 2 - 1) - lp) * 0.34;
        d[i] = lp * decay;
      }
    }
    return roomIR;
  }

  // A gentle odd-order curve: transparent until it is pushed, never fizzy
  function driveCurve(amount) {
    const n = 1024, curve = new Float32Array(n), k = 1 + amount * 14;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    return curve;
  }

  async function onAir(buf, drive) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return buf;
    // Room enough on the end for the decay, which is part of the sound rather than a tail to trim
    const extra = Math.ceil(buf.sampleRate * ROOM_SECONDS);
    const off = new OAC(1, buf.length + extra, buf.sampleRate);
    const src = off.createBufferSource();
    src.buffer = buf;

    const hp = off.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 95;

    const mud = off.createBiquadFilter();
    mud.type = "peaking"; mud.frequency.value = 420; mud.Q.value = 1; mud.gain.value = -3.5;

    const presence = off.createBiquadFilter();
    presence.type = "peaking"; presence.frequency.value = 3100; presence.Q.value = 0.8;
    presence.gain.value = 4.5 + 2 * drive;

    // The model renders everything quiet, so the level has to come up before anything can squash it.
    // Not too far: driven hard the first pass at this came out at a 6.3 dB crest factor, which is
    // flatter than broadcast speech and reads as loud and lifeless rather than as urgent. Real
    // commentary lands around 9 to 11 dB -- compressed, but still breathing.
    const into = off.createGain();
    into.gain.value = 4 + 2.5 * drive;

    const comp = off.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 3.5;
    comp.attack.value = 0.006; comp.release.value = 0.18;

    const shaper = off.createWaveShaper();
    shaper.curve = driveCurve(0.08 + 0.3 * drive);
    shaper.oversample = "4x";

    const dry = off.createGain(); dry.gain.value = 1;
    const wet = off.createGain(); wet.gain.value = 0.05 + 0.09 * drive;
    const verb = off.createConvolver();
    verb.buffer = room(off);

    const out = off.createGain(); out.gain.value = 0.7;

    src.connect(hp); hp.connect(mud); mud.connect(presence); presence.connect(into);
    into.connect(comp); comp.connect(shaper);
    shaper.connect(dry); dry.connect(out);
    shaper.connect(verb); verb.connect(wet); wet.connect(out);
    out.connect(off.destination);
    src.start();
    let done;
    try { done = await off.startRendering(); } catch (e) { return buf; }
    // Whatever the chain adds up to, nothing may leave here over full scale: this is cached and
    // then mixed with a crowd and encoded, and a sample above 1 is a crack in every one of those
    // places. Scaled rather than clipped, so the shape of the line survives.
    const d = done.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
    if (peak > CEILING) { const k = CEILING / peak; for (let i = 0; i < d.length; i++) d[i] *= k; }
    return done;
  }

  // One phrase at a time, at the pace that phrase wants. Kokoro has no mark-up for stress, but a
  // commentator's emphasis is carried by pace and loudness as much as by pitch, and the page
  // already works out which phrases are the shout and which are the hanging pause. Rendering phrase
  // by phrase and shaping each one keeps the emphasis where the writing put it, and the joins fall
  // on the punctuation, where a speaker would draw breath anyway.
  async function render(text, voice, speed, drive = 0) {
    const key = `${voice}|${speed}|${drive}|${text}`;
    if (cache.has(key)) return cache.get(key);
    const engine = await load();
    const out = await engine.generate(text, { voice, speed });
    const samples = out.audio || out.data || out.samples;
    const rate = out.sampling_rate || out.sampleRate || 24000;
    const ctx = context();
    if (!ctx) return null;
    const buf = ctx.createBuffer(1, samples.length, rate);
    const pcm = Float32Array.from(samples);
    // The model puts an impulse in the first few samples of everything it renders -- measured at
    // -22 where speech sits around 0.02, which is a click at the top of every phrase, heard live as
    // well as in a downloaded clip. Anything outside the range audio is defined over is brought
    // back into it, and a five-millisecond fade at each end removes both that transient and the
    // click at the joins, where one phrase is laid against the next.
    const edge = Math.min(Math.round(rate * 0.005), pcm.length >> 1);
    for (let i = 0; i < pcm.length; i++) {
      let v = pcm[i];
      if (!(v > -1)) v = v < 0 ? -1 : 0;        // also catches NaN
      else if (v > 1) v = 1;
      if (i < edge) v *= i / edge;
      else if (i >= pcm.length - edge) v *= (pcm.length - 1 - i) / edge;
      pcm[i] = v;
    }
    buf.copyToChannel(pcm, 0);
    // Cached already on the microphone, so playing a line costs nothing beyond handing over samples
    // and the video export gets exactly what the speaker got
    const aired = await onAir(buf, drive);
    cache.set(key, aired);
    return aired;
  }

  // Phrases of one line, played end to end, each with its own pace and level
  async function say(parts, voice, onStart, onEnd) {
    const ctx = context();
    if (!ctx) { onEnd && onEnd(); return; }
    if (ctx.state === "suspended") await ctx.resume();
    const buffers = [];
    for (const p of parts) buffers.push({ buf: await render(p.text, voice, p.speed, p.drive || 0), gain: p.gain });
    if (playing) return;                       // a newer line took over while this was rendering
    let at = ctx.currentTime + 0.02;
    const nodes = [];
    onStart && onStart();
    for (const { buf, gain } of buffers) {
      if (!buf) continue;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(g).connect(ctx.destination);
      src.start(at);
      nodes.push(src);
      at += buf.duration;                      // the pauses are in the audio already
    }
    if (!nodes.length) { onEnd && onEnd(); return; }
    playing = nodes;
    nodes[nodes.length - 1].onended = () => { playing = null; onEnd && onEnd(); };
  }

  function stop() {
    if (!playing) return;
    for (const n of playing) { try { n.onended = null; n.stop(); } catch (e) { /* already done */ } }
    playing = null;
  }

  // Render a whole clip's commentary up front, so nothing has to wait mid-move
  async function warm(parts, voice, onStatus) {
    let done = 0;
    for (const p of parts) {
      await render(p.text, voice, p.speed, p.drive || 0);
      done++;
      onStatus && onStatus(`Reading the commentary… ${Math.round((done / parts.length) * 100)}%`);
    }
    onStatus && onStatus("");
  }

  // The same phrases a line is spoken from, laid end to end into one buffer instead of being
  // played. The video exporter needs the commentary as audio it can place on a timeline and mix,
  // rather than as something that happens live at the speaker, and this is the only voice that can
  // be rendered at all: the browser's own speech synthesis will talk, but it will not hand over
  // samples, so a downloaded clip can only carry a commentator if this one is the one in use.
  async function renderLine(parts, voice) {
    const ctx = context();
    if (!ctx) return null;
    const bufs = [];
    for (const p of parts) {
      const buf = await render(p.text, voice, p.speed, p.drive || 0);
      if (buf) bufs.push({ buf, gain: p.gain });
    }
    if (!bufs.length) return null;
    const rate = bufs[0].buf.sampleRate;
    const total = bufs.reduce((n, b) => n + b.buf.length, 0);
    const out = ctx.createBuffer(1, total, rate);
    const data = out.getChannelData(0);
    let at = 0;
    for (const { buf, gain } of bufs) {
      const from = buf.getChannelData(0);
      for (let i = 0; i < from.length; i++) data[at + i] = from[i] * gain;
      at += from.length;
    }
    return out;
  }

  // How long a line will take to say, for anything that needs to fit it into a gap. Only answers
  // from what has already been rendered -- the point is to decide without waiting for the model.
  function secondsOf(parts, voice) {
    let total = 0;
    for (const p of parts) {
      const buf = cache.get(`${voice}|${p.speed}|${p.drive || 0}|${p.text}`);
      if (!buf) return null;
      total += buf.duration;
    }
    return total;
  }

  window.BirdseyeVoice = {
    voices: VOICES,
    supported: typeof WebAssembly === "object",
    ready: () => !!tts,
    load, say, stop, warm, renderLine, secondsOf,
    busy: () => !!playing
  };
})();
