// Synthesized sound: one engine oscillator whose pitch follows speed,
// short blips for pickups and crashes, and an eight-note bass loop that
// doubles as the pirate station's music. No audio files anywhere.
let audioCtx = null;
let engineOsc = null;
let engineGain = null;
let lastNote = -1;
let silenced = false;

function initAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
      engineOsc = audioCtx.createOscillator();
      engineGain = audioCtx.createGain();
      engineGain.gain.value = 0;
      engineOsc.type = "triangle";
      engineOsc.connect(engineGain).connect(audioCtx.destination);
      engineOsc.start();
    }
    audioCtx.resume();
  } catch {}
}

function blip(freq, dur, shape = "sine", vol = 0.045, slideTo = freq) {
  if (!audioCtx || silenced) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const t = audioCtx.currentTime;
  o.type = shape;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  o.stop(t + dur);
}

function playSound(kind) {
  if (kind === "pickup") blip(392, 0.25, "triangle", 0.09, 784);
  else if (kind === "crash") blip(88, 0.15, "sawtooth", 0.06, 32);
  else blip(230, 0.15, "sawtooth", 0.06, 32);
}

function stepAudio() {
  if (!audioCtx) return;
  engineGain.gain.value = !silenced && W.mode === "play" && ME.ride ? 0.012 : 0;
  if (W.mode !== "play") return;
  engineOsc.frequency.value = 48 + Math.abs(ME.ride?.speed || 0) * 0.65;
  const beat = Math.floor(W.t * 2.8);
  if (beat === lastNote) return;
  lastNote = beat;
  blip([98, 147, 116, 130, 98, 174, 146, 110][beat % 8], 0.29, "triangle", 0.045);
  if (W.heat && beat % 3 === 0) blip(400, 0.42, "sine", 0.022, 730);
}
