// Look-ahead scheduler: setInterval polls the Web Audio clock and schedules
// every step falling inside the look-ahead window. Each track's playhead is
// independent (t.si % klen), which is what creates the polyrhythmic drift.

import { klen } from './tracks.js';

const AHEAD = 0.1;   // seconds of look-ahead
const POLL = 25;     // ms polling interval

export function createScheduler(ctx, state, fire) {
  let timer = null;
  let nextTime = 0;

  const stepDur = () => 60 / state.bpm / 4; // 16th note

  function tick() {
    while (nextTime < ctx.currentTime + AHEAD) {
      const t = nextTime;
      state.tracks.forEach((tr) => {
        fire(tr, tr.si % klen(tr.kv), t);
        tr.si++;
      });
      nextTime += stepDur();
    }
  }

  return {
    start() {
      state.tracks.forEach((t) => { t.si = 0; });
      nextTime = ctx.currentTime + 0.05;
      tick();
      timer = setInterval(tick, POLL);
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
    get running() { return timer !== null; },
  };
}
