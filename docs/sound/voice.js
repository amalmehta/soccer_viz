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

  // One phrase at a time, at the pace that phrase wants. Kokoro has no mark-up for stress, but a
  // commentator's emphasis is carried by pace and loudness as much as by pitch, and the page
  // already works out which phrases are the shout and which are the hanging pause. Rendering phrase
  // by phrase and shaping each one keeps the emphasis where the writing put it, and the joins fall
  // on the punctuation, where a speaker would draw breath anyway.
  async function render(text, voice, speed) {
    const key = `${voice}|${speed}|${text}`;
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
    cache.set(key, buf);
    return buf;
  }

  // Phrases of one line, played end to end, each with its own pace and level
  async function say(parts, voice, onStart, onEnd) {
    const ctx = context();
    if (!ctx) { onEnd && onEnd(); return; }
    if (ctx.state === "suspended") await ctx.resume();
    const buffers = [];
    for (const p of parts) buffers.push({ buf: await render(p.text, voice, p.speed), gain: p.gain });
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
      await render(p.text, voice, p.speed);
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
      const buf = await render(p.text, voice, p.speed);
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

  window.BirdseyeVoice = {
    voices: VOICES,
    supported: typeof WebAssembly === "object",
    ready: () => !!tts,
    load, say, stop, warm, renderLine,
    busy: () => !!playing
  };
})();
