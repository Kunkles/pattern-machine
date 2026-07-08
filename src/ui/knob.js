// Reusable SVG knob with pointer capture.
// Drag threshold: 3px vertical before it registers as a drag.
// Sensitivity: 150px of travel = full 0→1 range.
// A pointerup with no drag counts as a click (used by THIN to re-roll).

const NS = 'http://www.w3.org/2000/svg';

export function makeKnob(label, { get, set, onClick, onPointerDown, format }) {
  const wrap = document.createElement('div');
  wrap.className = 'knob';

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.classList.add('knob-svg');

  const ring = document.createElementNS(NS, 'circle');
  ring.setAttribute('cx', 20);
  ring.setAttribute('cy', 20);
  ring.setAttribute('r', 15);
  ring.setAttribute('class', 'knob-ring');

  const pointer = document.createElementNS(NS, 'line');
  pointer.setAttribute('x1', 20);
  pointer.setAttribute('y1', 20);
  pointer.setAttribute('x2', 20);
  pointer.setAttribute('y2', 7);
  pointer.setAttribute('class', 'knob-pointer');

  svg.append(ring, pointer);

  const name = document.createElement('div');
  name.className = 'knob-label';
  name.textContent = label;

  const readout = document.createElement('div');
  readout.className = 'knob-value';

  wrap.append(svg, name, readout);

  function render() {
    const v = get();
    pointer.setAttribute('transform', `rotate(${-135 + v * 270} 20 20)`);
    readout.textContent = format ? format(v) : Math.round(v * 100);
  }

  let y0 = 0, v0 = 0, dragging = false, down = false;

  svg.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { svg.setPointerCapture(e.pointerId); } catch { /* no active pointer (synthetic events) */ }
    down = true;
    dragging = false;
    y0 = e.clientY;
    v0 = get();
    if (onPointerDown) onPointerDown();
  });

  svg.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dy = y0 - e.clientY;
    if (!dragging && Math.abs(dy) < 3) return;
    dragging = true;
    set(Math.min(1, Math.max(0, v0 + dy / 150)));
    render();
  });

  svg.addEventListener('pointerup', (e) => {
    if (!down) return;
    down = false;
    try { svg.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    if (!dragging && onClick) onClick();
    render();
  });

  render();
  return { el: wrap, render };
}
