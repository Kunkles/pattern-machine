// Step button row renderer. States: off, on (amber), suppressed-by-THIN
// (dashed teal), playhead-current (red). Visual gap before every bs-th step.

import { klen } from '../engine/tracks.js';
import { initSparseOrder } from '../algo/sparse.js';

export function makeStepGrid(track, getBs, onChange) {
  const el = document.createElement('div');
  el.className = 'stepgrid';
  let cells = [];
  let cur = -1;

  function render() {
    el.innerHTML = '';
    cells = [];
    const len = klen(track.kv);
    const bs = getBs();
    for (let i = 0; i < len; i++) {
      const cell = document.createElement('div');
      cell.className = 'step';
      if (i > 0 && i % bs === 0) cell.classList.add('beatgap');
      if (track.steps[i]) cell.classList.add(track.sparseSet.has(i) ? 'sparse' : 'on');
      if (i === cur) cell.classList.add('cur');
      cell.addEventListener('click', () => {
        track.steps[i] = !track.steps[i];
        initSparseOrder(track);
        render();
        if (onChange) onChange();
      });
      cells.push(cell);
      el.appendChild(cell);
    }
  }

  function setPlayhead(i) {
    if (cells[cur]) cells[cur].classList.remove('cur');
    cur = i;
    if (cells[cur]) cells[cur].classList.add('cur');
  }

  render();
  return { el, render, setPlayhead };
}
