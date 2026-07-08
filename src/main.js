// Pattern Machine — entry point. Builds UI, wires events, owns app state.

import { TRACK_DEFS, MAXLEN, klen, makeTrack } from './engine/tracks.js';
import { createScheduler } from './engine/scheduler.js';
import { playSynth } from './engine/synth.js';
import { loadWav, playBuffer } from './engine/sampler.js';
import { hpRH } from './algo/rh.js';
import { hpDNB } from './algo/dnb.js';
import { initSparseOrder, applySparse } from './algo/sparse.js';
import { makeKnob } from './ui/knob.js';
import { makeStepGrid } from './ui/stepgrid.js';
import { makeControls, SIGS } from './ui/controls.js';

const state = {
  bpm: 118,
  sig: '4/4',
  mode: 'rh', // 'rh' | 'dnb'
  tracks: TRACK_DEFS.map(makeTrack),
};

const bs = () => SIGS[state.sig];

let ctx = null;
let master = null;
function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function randomizeTrack(t) {
  const hp = state.mode === 'dnb' ? hpDNB : hpRH;
  for (let i = 0; i < MAXLEN; i++) {
    t.steps[i] = Math.random() < hp(t.id, i, klen(t.kv), bs());
  }
  initSparseOrder(t);
}

// --- build UI ---

const app = document.getElementById('app');
const title = document.createElement('h1');
title.textContent = 'PATTERN MACHINE';
app.appendChild(title);

const grids = [];

const controls = makeControls(state, {
  togglePlay() {
    audio();
    if (scheduler.running) {
      scheduler.stop();
      controls.setPlaying(false);
      grids.forEach((g) => g.setPlayhead(-1));
    } else {
      scheduler.start();
      controls.setPlaying(true);
    }
  },
  onSigChange() {
    grids.forEach((g) => g.render());
  },
  randomizeAll() {
    state.tracks.forEach(randomizeTrack);
    grids.forEach((g) => g.render());
  },
});
app.appendChild(controls.el);

state.tracks.forEach((t, ti) => {
  const row = document.createElement('div');
  row.className = 'track';

  const name = document.createElement('div');
  name.className = 'track-name';
  name.textContent = t.name;

  const lenKnob = makeKnob('LEN', {
    get: () => t.kv,
    set: (v) => {
      t.kv = v;
      initSparseOrder(t); // sparse order is scoped to the new length
      grids[ti].render();
    },
    format: (v) => klen(v),
  });

  const thinKnob = makeKnob('THIN', {
    get: () => t.sv,
    set: (v) => {
      t.sv = v;
      applySparse(t);
      grids[ti].render();
    },
    onPointerDown: () => initSparseOrder(t), // seed the random order immediately
    onClick: () => {
      initSparseOrder(t); // click without drag = re-roll
      grids[ti].render();
    },
    format: (v) => Math.round(v * 100),
  });

  const btns = document.createElement('div');
  btns.className = 'track-btns';

  const mute = document.createElement('button');
  mute.className = 'btn small';
  mute.textContent = 'MUTE';
  mute.addEventListener('click', () => {
    t.muted = !t.muted; // playhead keeps running so it re-enters in time
    mute.classList.toggle('active', t.muted);
  });

  const load = document.createElement('button');
  load.className = 'btn small';
  load.textContent = 'LOAD';
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = '.wav,audio/wav';
  file.style.display = 'none';
  file.addEventListener('change', async () => {
    if (!file.files[0]) return;
    t.buffer = await loadWav(audio(), file.files[0]);
    load.classList.add('active');
  });
  load.addEventListener('click', () => file.click());

  const reroll = document.createElement('button');
  reroll.className = 'btn small';
  reroll.textContent = '⟳';
  reroll.addEventListener('click', () => {
    randomizeTrack(t);
    grids[ti].render();
  });

  btns.append(mute, load, reroll, file);

  const grid = makeStepGrid(t, bs);
  grids.push(grid);

  row.append(name, lenKnob.el, thinKnob.el, btns, grid.el);
  app.appendChild(row);
});

const hint = document.createElement('div');
hint.className = 'hint';
hint.innerHTML =
  'Drag knobs vertically. Click THIN (no drag) to re-roll suppressed steps. ' +
  'Click any step to toggle it. Different LEN per track = polyrhythmic drift.';
app.appendChild(hint);

// --- scheduler ---

function fire(t, step, time) {
  // visual playhead, synced to audio time
  const gi = state.tracks.indexOf(t);
  setTimeout(() => {
    if (scheduler.running) grids[gi].setPlayhead(step);
  }, Math.max(0, (time - ctx.currentTime) * 1000));

  if (t.muted || !t.steps[step] || t.sparseSet.has(step)) return;
  if (t.buffer) playBuffer(ctx, master, t.buffer, time);
  else playSynth(ctx, master, t.id, time, state.mode);
}

const scheduler = createScheduler(
  { get currentTime() { return ctx ? ctx.currentTime : 0; } },
  state,
  fire,
);

// seed initial patterns
state.tracks.forEach(randomizeTrack);
grids.forEach((g) => g.render());
