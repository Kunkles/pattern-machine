// THIN knob logic: suppress a random subset of active steps without deleting them.

import { klen } from '../engine/tracks.js';

// Seed (or re-roll) the shuffled order of active steps within the current
// pattern length, then apply.
export function initSparseOrder(t) {
  const len = klen(t.kv);
  const active = [];
  for (let i = 0; i < len; i++) if (t.steps[i]) active.push(i);
  for (let i = active.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [active[i], active[j]] = [active[j], active[i]];
  }
  t.sparseOrder = active;
  applySparse(t);
}

// Suppress the first N steps of the shuffled order, N driven by the knob value.
export function applySparse(t) {
  const n = Math.round(t.sv * t.sparseOrder.length);
  t.sparseSet = new Set(t.sparseOrder.slice(0, n));
}
