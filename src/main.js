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
import { createDialLink } from './bridge/diallink.js';
import { createSerialLink } from './bridge/seriallink.js';

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

// fan out to both pod links (WiFi WebSocket + USB serial)
const pod = {
  sendState() {
    dial.sendState();
    usb.sendState();
  },
  sendPlayhead(tr, st) {
    dial.sendPlayhead(tr, st);
    usb.sendPlayhead(tr, st);
  },
};

function doTogglePlay() {
  audio();
  if (scheduler.running) {
    scheduler.stop();
    controls.setPlaying(false);
    grids.forEach((g) => g.setPlayhead(-1));
  } else {
    scheduler.start();
    controls.setPlaying(true);
  }
  pod.sendState();
}

const controls = makeControls(state, {
  togglePlay: () => doTogglePlay(),
  onSigChange() {
    grids.forEach((g) => g.render());
    pod.sendState();
  },
  randomizeAll() {
    state.tracks.forEach(randomizeTrack);
    grids.forEach((g) => g.render());
    pod.sendState();
  },
  onChange: () => pod.sendState(),
  onDial() {
    if (dial.active) {
      dial.disconnect();
      return;
    }
    const u = prompt('Dial pod address (shown on its screen)', dial.url || 'ws://patternpod.local:81');
    if (u) dial.connect(u.trim());
  },
  onUsb() {
    if (usb.active) usb.disconnect();
    else usb.connect();
  },
});
app.appendChild(controls.el);

// what the pod needs to mirror the app: per-track lengths, steps, THIN set
function dialState() {
  return {
    t: 'state',
    bpm: state.bpm,
    playing: scheduler.running,
    tracks: state.tracks.map((t) => {
      const len = klen(t.kv);
      return {
        n: t.name,
        len,
        steps: Array.from({ length: len }, (_, i) => (t.steps[i] ? 1 : 0)),
        sparse: [...t.sparseSet].filter((i) => i < len),
      };
    }),
  };
}

const podHandlers = {
  toggle(tr, st) {
    const t = state.tracks[tr];
    if (!t) return;
    t.steps[st] = !t.steps[st];
    initSparseOrder(t);
    grids[tr].render();
    pod.sendState(); // echo canonical state back (sparse set was re-rolled)
  },
  play() {
    if (!scheduler.running) doTogglePlay();
    else pod.sendState();
  },
  stop() {
    if (scheduler.running) doTogglePlay();
    else pod.sendState();
  },
  rand(tr) {
    const t = state.tracks[tr];
    if (!t) return;
    randomizeTrack(t);
    grids[tr].render();
    pod.sendState();
  },
};

const dial = createDialLink(dialState, {
  ...podHandlers,
  onStatus: (s) => controls.setDialStatus(s),
});

const usb = createSerialLink(dialState, {
  ...podHandlers,
  onStatus: (s) => controls.setUsbStatus(s),
});
if (!usb.supported) controls.hideUsb();

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
      pod.sendState();
    },
    format: (v) => klen(v),
  });

  const thinKnob = makeKnob('THIN', {
    get: () => t.sv,
    set: (v) => {
      t.sv = v;
      applySparse(t);
      grids[ti].render();
      pod.sendState();
    },
    onPointerDown: () => initSparseOrder(t), // seed the random order immediately
    onClick: () => {
      initSparseOrder(t); // click without drag = re-roll
      grids[ti].render();
      pod.sendState();
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
    pod.sendState();
  });

  btns.append(mute, load, reroll, file);

  const grid = makeStepGrid(t, bs, () => pod.sendState());
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
    if (scheduler.running) {
      grids[gi].setPlayhead(step);
      pod.sendPlayhead(gi, step);
    }
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
