// Radiohead-mode probability model, reconstructed from the handoff spec.
// bs = steps per beat from the time signature (4/4→4, 3/4→3, 5/4→5, 6/8→3, 7/8→7).
// NOTE: if you have the original v8 widget source, paste its hpRH body here —
// this is a faithful reconstruction from the documented probabilities.

export function hpRH(id, i, len, bs) {
  const beatNum = Math.floor(i / bs);
  const beatPos = i % bs;
  const half = Math.round(bs / 2);

  if (id === 0) { // kick: anchor beat 1, downbeats, mid-beat, triplet ghosts
    if (i === 0) return 0.93;
    if (beatPos === 0) return 0.50;
    if (beatPos === half) return 0.24;
    if (i % 3 === 0) return 0.18;
    return 0.06;
  }

  if (id === 1) { // snare: backbeats, displaced backbeats, quarter-beat ghosts
    const backbeat = beatNum % 2 === 1;
    if (backbeat && beatPos === 0) return 0.82;
    if (backbeat && beatPos === 1) return 0.32;
    if (beatPos === Math.max(1, Math.round(bs * 0.25))) return 0.14;
    return 0.05;
  }

  if (id === 2) { // hi-hat: offbeat emphasis
    if (beatPos === half) return 0.65;
    if (beatPos === 0) return 0.28;
    return 0.20;
  }

  // closed hat: simple alternating density
  return i % 2 === 0 ? 0.72 : 0.36;
}
