// Global controls: BPM, time signature, mode toggle, randomize all, play/stop.

export const SIGS = { '4/4': 4, '3/4': 3, '5/4': 5, '6/8': 3, '7/8': 7 };

export function makeControls(state, handlers) {
  const bar = document.createElement('div');
  bar.className = 'controls';

  // Play / stop
  const play = document.createElement('button');
  play.id = 'play';
  play.className = 'btn play';
  play.textContent = '▶';
  play.addEventListener('click', () => handlers.togglePlay());

  // BPM slider
  const bpmWrap = document.createElement('label');
  bpmWrap.className = 'bpm';
  const bpmVal = document.createElement('span');
  bpmVal.className = 'bpm-val';
  const bpm = document.createElement('input');
  bpm.type = 'range';
  bpm.min = 40;
  bpm.max = 220;
  bpm.value = state.bpm;
  bpm.addEventListener('input', () => {
    state.bpm = +bpm.value;
    bpmVal.textContent = `${state.bpm} BPM`;
    if (handlers.onChange) handlers.onChange();
  });
  bpmVal.textContent = `${state.bpm} BPM`;
  bpmWrap.append(bpm, bpmVal);

  // Time signature
  const sig = document.createElement('select');
  sig.className = 'sig';
  for (const s of Object.keys(SIGS)) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sig.appendChild(opt);
  }
  sig.value = state.sig;
  sig.addEventListener('change', () => {
    state.sig = sig.value;
    handlers.onSigChange();
  });

  // Mode toggle with BPM auto-nudge
  const mode = document.createElement('button');
  mode.className = 'btn mode';
  const renderMode = () => { mode.textContent = state.mode === 'rh' ? 'RH' : 'D&B'; };
  mode.addEventListener('click', () => {
    state.mode = state.mode === 'rh' ? 'dnb' : 'rh';
    if (state.mode === 'dnb' && state.bpm < 140) state.bpm = 170;
    if (state.mode === 'rh' && state.bpm > 150) state.bpm = 118;
    bpm.value = state.bpm;
    bpmVal.textContent = `${state.bpm} BPM`;
    renderMode();
    if (handlers.onChange) handlers.onChange();
  });
  renderMode();

  // Randomize all
  const rand = document.createElement('button');
  rand.className = 'btn';
  rand.textContent = 'RANDOMIZE';
  rand.addEventListener('click', () => handlers.randomizeAll());

  // Dial pod link (firmware/m5dial-pod)
  const dial = document.createElement('button');
  dial.className = 'btn dial';
  dial.textContent = 'DIAL';
  dial.addEventListener('click', () => handlers.onDial());

  bar.append(play, bpmWrap, sig, mode, rand, dial);

  return {
    el: bar,
    setPlaying(on) { play.textContent = on ? '■' : '▶'; },
    setDialStatus(s) {
      dial.classList.toggle('on', s === 'on');
      dial.classList.toggle('wait', s === 'wait');
    },
  };
}
