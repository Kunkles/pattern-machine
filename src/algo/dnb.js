// Drum & Bass probability model, reconstructed from the handoff spec.
// Operates on a fixed 16-step bar grid regardless of time signature (by design).
// NOTE: if you have the original v8 widget source, paste its hpDNB body here.

export function hpDNB(id, i, len, bs) {
  const bar = i % 16;
  const beat = Math.floor(bar / 4);
  const sub = bar % 4;

  if (id === 0) { // kick: beat 1, "and of 2", "and of 3", pickup, syncopations
    if (bar === 0) return 0.95;
    if (bar === 6) return 0.75;
    if (bar === 10) return 0.55;
    if (bar === 14) return 0.50;
    if (bar === 3) return 0.30;
    if (bar === 13) return 0.25;
    return 0.06;
  }

  if (id === 1) { // snare: half-time crack on step 8 (beat 3), ghosts around it
    if (bar === 8) return 0.95;
    if (bar === 11) return 0.30;
    if (bar === 13) return 0.22;
    if (bar === 7) return 0.18;
    if (bar === 9) return 0.15;
    return 0.04;
  }

  if (id === 2) { // hi-hat: dense rolling, offbeats favored, second half denser
    let p = sub === 2 ? 0.75 : 0.45;
    if (bar >= 8) p += 0.15;
    return Math.min(p, 0.95);
  }

  // closed hat: gap filler, rolls harder in the bar's second half
  let p = (sub === 1 || sub === 3) ? 0.50 : 0.18;
  if (bar >= 8) p += 0.20;
  return p;
}
