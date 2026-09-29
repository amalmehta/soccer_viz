// An optional score under the play: a loop that sits low while the move builds and lifts as the
// ball gets close to goal, with a brass swell when one goes in. The music is embedded in
// sound/recordings.js (Holst's Mars, played by the US Air Force Band, public domain), so nothing is
// fetched at runtime. Without those recordings this module does nothing and the button stays hidden.
(() => {
  "use strict";

  const BED = 0.34, GOAL_LIFT = 0.55, DUCK = 0.45;   // levels: bed, goal swell, and under a voice

  function decode(ac, b64) {
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return ac.decodeAudioData(bytes.buffer);
  }

  async function loadBuffers(ac) {
    const src = window.BirdseyeScoreAudio;
    if (!src) return null;
    const [bed, swell] = await Promise.all([decode(ac, src.bed), decode(ac, src.swell)]);
    return { bed, swell };
  }

  // How loud the music should be at this moment: low while the move is being built, rising as the
  // ball nears the goal, so the score follows the play instead of droning through it.
  function levelAt(R, t) {
    const ball = R.ballAt(t);
    const toGoal = Math.hypot(105 - ball.x, 34 - ball.y);
    const close = Math.max(0, Math.min(1, (60 - toGoal) / 45));
    return 0.55 + 0.45 * close * close;
  }

  function goalAt(play, t) {
    for (const ev of play.events) {
      if (ev.type === "goal" && t >= ev.t - 0.35 && t < ev.t + 6) return ev.t;
    }
    return null;
  }

  function createLive() {
    if (!window.BirdseyeScoreAudio) return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ac = new Ctx();
    let buffers = null, bedNode = null, gain = null, swellAt = -1, ducked = false, started = false;
    const ready = loadBuffers(ac).then(b => { buffers = b; }).catch(() => { buffers = null; });

    function start() {
      if (started || !buffers) return;
      started = true;
      gain = ac.createGain();
      gain.gain.value = 0;
      gain.connect(ac.destination);
      bedNode = ac.createBufferSource();
      bedNode.buffer = buffers.bed;
      bedNode.loop = true;
      bedNode.connect(gain);
      bedNode.start();
    }

    return {
      ready,
      resume() { if (ac.state === "suspended") ac.resume(); },
      duck(on) { ducked = on; },
      stop() {
        if (!started) return;
        gain.gain.cancelScheduledValues(ac.currentTime);
        gain.gain.setTargetAtTime(0, ac.currentTime, 0.25);
      },
      update(R, t, playing) {
        if (!buffers) return;
        start();
        if (!started) return;
        if (!playing) {
          gain.gain.setTargetAtTime(0, ac.currentTime, 0.4);
          return;
        }
        const want = BED * levelAt(R, t) * (ducked ? DUCK : 1);
        gain.gain.setTargetAtTime(want, ac.currentTime, 0.25);
        const goal = goalAt(R.play, t);
        if (goal != null && goal !== swellAt && t < goal + 0.5) {
          swellAt = goal;
          const one = ac.createBufferSource();
          one.buffer = buffers.swell;
          const swellGain = ac.createGain();
          swellGain.gain.value = GOAL_LIFT * (ducked ? DUCK : 1);
          one.connect(swellGain).connect(ac.destination);
          one.start();
        }
        if (goal == null) swellAt = -1;
      }
    };
  }

  // The same mix, rendered ahead of time for a downloaded video
  async function renderOffline(R, times, fps, sampleRate = 48000) {
    if (!window.BirdseyeScoreAudio || !window.OfflineAudioContext) return null;
    const seconds = Math.max(times[times.length - 1] + 0.6, 1);
    const ac = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
    const buffers = await loadBuffers(ac);
    if (!buffers) return null;

    const gain = ac.createGain();
    gain.connect(ac.destination);
    const bed = ac.createBufferSource();
    bed.buffer = buffers.bed;
    bed.loop = true;
    bed.connect(gain);
    bed.start();

    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(BED * levelAt(R, 0), 0.8);
    for (let i = 0; i < times.length; i += Math.max(1, Math.round(fps / 4))) {
      const t = times[i];
      gain.gain.linearRampToValueAtTime(BED * levelAt(R, Math.min(t, R.play.duration)), t);
    }
    gain.gain.linearRampToValueAtTime(0, seconds);

    for (const ev of R.play.events) {
      if (ev.type !== "goal") continue;
      const one = ac.createBufferSource();
      one.buffer = buffers.swell;
      const swellGain = ac.createGain();
      swellGain.gain.value = GOAL_LIFT;
      one.connect(swellGain).connect(ac.destination);
      one.start(Math.max(0, ev.t - 0.2));
    }
    return ac.startRendering();
  }

  window.BirdseyeScore = { createLive, renderOffline, levelAt };
})();
