// Synthesized fallback voices. D&B mode uses tighter envelopes.

let noiseBuf = null;
function noise(ctx) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function playNoise(ctx, dest, time, { hp, dur, gain }) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  src.connect(filt).connect(g).connect(dest);
  src.start(time);
  src.stop(time + dur);
}

function playKick(ctx, dest, time, mode) {
  const f0 = mode === 'dnb' ? 180 : 155;
  const dur = mode === 'dnb' ? 0.28 : 0.45;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(f0, time);
  osc.frequency.exponentialRampToValueAtTime(1, time + dur * 0.9);
  g.gain.setValueAtTime(1, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(g).connect(dest);
  osc.start(time);
  osc.stop(time + dur);
}

// Trigger the synth voice for track index 0–3 (kick, snare, hi-hat, closed hat).
export function playSynth(ctx, dest, trackId, time, mode) {
  const dnb = mode === 'dnb';
  switch (trackId) {
    case 0: playKick(ctx, dest, time, mode); break;
    case 1: playNoise(ctx, dest, time, { hp: dnb ? 1200 : 900, dur: dnb ? 0.10 : 0.14, gain: 0.8 }); break;
    case 2: playNoise(ctx, dest, time, { hp: 7000, dur: dnb ? 0.18 : 0.28, gain: 0.5 }); break;
    case 3: playNoise(ctx, dest, time, { hp: 7200, dur: 0.04, gain: 0.5 }); break;
  }
}
