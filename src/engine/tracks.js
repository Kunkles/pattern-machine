// Track state model.

export const LENS = [4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32];
export const MAXLEN = 32;

export const TRACK_DEFS = [
  { id: 0, name: 'KICK' },
  { id: 1, name: 'SNARE' },
  { id: 2, name: 'HI-HAT' },
  { id: 3, name: 'CL HAT' },
];

// Map a 0–1 knob value onto the LENS array.
export function klen(kv) {
  return LENS[Math.round(kv * (LENS.length - 1))];
}

export function makeTrack(def) {
  return {
    ...def,
    steps: new Array(MAXLEN).fill(false),
    kv: LENS.indexOf(16) / (LENS.length - 1), // LEN knob, defaults to 16 steps
    sv: 0,                                    // THIN knob 0–1
    sparseOrder: [],                          // shuffled active-step indices
    sparseSet: new Set(),                     // currently suppressed steps
    muted: false,
    buffer: null,                             // loaded WAV AudioBuffer, null = synth
    si: 0,                                    // independent playhead
  };
}
