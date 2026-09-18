// Stadium sound from real crowd recordings (public domain; see sound/recordings.js and
// build_sounds.py): a stadium ambience that loops underneath and swells as the ball nears goal
// and at shots, and a real fans' reaction for goals. Live playback uses an AudioContext; video
// downloads render the same mix in an OfflineAudioContext. No recordings means no crowd sound.
(() => {
  "use strict";
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // Crowd mood at play time t: murmur (overall level), excite (swell), roar (goal)
  function levels(R, t) {
    const play = R.play;
    const ball = R.ballAt(t);
    const tension = Math.pow(clamp((ball.x - 62) / 40, 0, 1), 1.5);
    let roar = 0, gasp = 0;
    for (const ev of play.events) {
      const d = t - ev.t;
      if (ev.type === "goal") {
        if (d > -0.25 && d < 0) roar = Math.max(roar, 0.6 * (1 + d / 0.25));
        else if (d >= 0) roar = Math.max(roar, d < 0.35 ? 0.6 + (0.4 * d) / 0.35 : Math.max(0.22, Math.exp(-(d - 0.35) / 3.5)));
      } else if (ev.type === "shot" || ev.type === "save") {
        if (d > -0.3 && d < 1.8) gasp = Math.max(gasp, d < 0 ? 0.6 * (1 + d / 0.3) : 0.6 * Math.exp(-d * 1.4));
      }
    }
    return { murmur: 0.5 + 0.3 * tension, excite: Math.min(1, 0.2 * tension + 0.7 * gasp + roar), roar, gasp };
  }

  // The recordings arrive as base64 in window.BirdseyeCrowdAudio and are decoded once per context
  function toArrayBuffer(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }

  // Time of the loudest quarter-second in a recording: the heart of the goal reaction
  function loudestMoment(buffer) {
    const data = buffer.getChannelData(0), step = Math.floor(buffer.sampleRate / 4);
    let best = 0, bestAt = 0;
    for (let i = 0; i + step < data.length; i += step) {
      let sum = 0;
      for (let j = i; j < i + step; j += 8) sum += data[j] * data[j];
      if (sum > best) { best = sum; bestAt = i / buffer.sampleRate; }
    }
    return bestAt;
  }

  const decoded = new WeakMap();
  function loadBuffers(ac) {
    if (!decoded.has(ac)) {
      const src = window.BirdseyeCrowdAudio;
      decoded.set(ac, src
        ? Promise.all([ac.decodeAudioData(toArrayBuffer(src.bed)), ac.decodeAudioData(toArrayBuffer(src.goal))])
            .then(([bed, goal]) => ({ bed, goal, goalPeak: loudestMoment(goal) }))
            .catch(e => { console.warn("Crowd recordings couldn't be decoded:", e); return null; })
        : Promise.resolve(null));
    }
    return decoded.get(ac);
  }

  function buildGraph(ac, buffers) {
    const out = ac.createGain();
    out.gain.value = 0;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    comp.attack.value = 0.03;
    comp.release.value = 0.4;
    comp.connect(out);
    out.connect(ac.destination);

    // The stadium ambience: louder and brighter as the crowd gets excited
    const bed = ac.createBufferSource();
    bed.buffer = buffers.bed;
    bed.loop = true;
    const tone = ac.createBiquadFilter();
    tone.type = "highshelf";
    tone.frequency.value = 2500;
    tone.gain.value = -6;
    const bedGain = ac.createGain();
    bedGain.gain.value = 0.6;
    bed.connect(tone);
    tone.connect(bedGain);
    bedGain.connect(comp);

    const goalBus = ac.createGain();
    goalBus.gain.value = 0.95;
    goalBus.connect(comp);

    return {
      out,
      start(at = 0, offset = 0) { bed.start(at, offset % buffers.bed.duration); },
      set(lv, at, tc) {
        // The goal recording carries the roar itself, so the ambience steps back under it
        bedGain.gain.setTargetAtTime((0.45 + 0.3 * lv.murmur + 0.45 * lv.excite) * (1 - 0.5 * lv.roar), at, tc);
        tone.gain.setTargetAtTime(-6 + 6 * lv.excite, at, tc);
      },
      // The fans' reaction, starting just before its loudest moment and fading after a few seconds
      goal(at) {
        const s = ac.createBufferSource();
        s.buffer = buffers.goal;
        const g = ac.createGain();
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(1, at + 0.25);
        g.gain.setValueAtTime(1, at + 5);
        g.gain.linearRampToValueAtTime(0, at + 9);
        s.connect(g);
        g.connect(goalBus);
        s.start(at, Math.max(0, buffers.goalPeak - 0.6));
        s.stop(at + 9.5);
        return s;
      }
    };
  }

  // Live: created on the first user gesture (browsers keep audio off until then)
  function createLive() {
    let ac = null, graph = null, duck = 1, bed = 0.9, lastSet = 0, lastT = null, goalSource = null;
    const stopGoal = () => {
      if (goalSource) { try { goalSource.stop(); } catch (e) { /* already stopped */ } goalSource = null; }
    };
    function ensure() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ac = new AC();
        loadBuffers(ac).then(buffers => {
          if (!buffers) return;
          graph = buildGraph(ac, buffers);
          graph.start(ac.currentTime + 0.05, Math.random() * buffers.bed.duration);
        });
      }
      if (ac.state === "suspended") ac.resume();
      return true;
    }
    return {
      resume: ensure,
      // Keep the commentary on top: the crowd drops fast while a line is spoken, eases back after
      duck(on) {
        duck = on ? 0.3 : 1;
        if (graph) graph.out.gain.setTargetAtTime(bed * duck, ac.currentTime, on ? 0.06 : 0.35);
      },
      setBed(level) { bed = level; },
      update(R, t, playing) {
        if (!graph) return;
        const now = ac.currentTime;
        if (!playing) {
          graph.out.gain.setTargetAtTime(0, now, 0.3);
          stopGoal();
          lastT = null;
          return;
        }
        // A goal reached during playback sets off the fans' reaction; scrubbing back cancels it
        if (lastT != null && t < lastT - 0.05) stopGoal();
        if (lastT != null && t >= lastT) {
          for (const ev of R.play.events) {
            if (ev.type === "goal" && lastT < ev.t && ev.t <= t) { stopGoal(); goalSource = graph.goal(now); }
          }
        }
        lastT = t;
        if (now - lastSet < 0.08) return;
        lastSet = now;
        graph.out.gain.setTargetAtTime(bed * duck, now, 0.25);
        graph.set(levels(R, t), now, 0.15);
      },
      stop() {
        if (graph) graph.out.gain.setTargetAtTime(0, ac.currentTime, 0.25);
        stopGoal();
      }
    };
  }

  // Offline: the crowd for a video, following the same frame timeline as the picture
  async function renderOffline(R, times, fps, sampleRate = 48000) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return null;
    const dur = times.length / fps;
    const oac = new OAC(2, Math.ceil(dur * sampleRate), sampleRate);
    const buffers = await loadBuffers(oac);
    if (!buffers) return null;
    const graph = buildGraph(oac, buffers);
    graph.out.gain.setValueAtTime(0, 0);
    graph.out.gain.linearRampToValueAtTime(0.9, 0.6);
    for (let i = 0; i < times.length; i += 3) graph.set(levels(R, times[i]), i / fps, 0.15);
    for (const ev of R.play.events) {
      if (ev.type !== "goal") continue;
      const frame = times.findIndex(tt => tt >= ev.t);
      if (frame >= 0) graph.goal(frame / fps);
    }
    graph.out.gain.setValueAtTime(0.9, Math.max(0.61, dur - 0.8));
    graph.out.gain.linearRampToValueAtTime(0, dur);
    graph.start(0, 0);
    return oac.startRendering();
  }

  window.BirdseyeCrowd = { createLive, renderOffline, levels };
})();
