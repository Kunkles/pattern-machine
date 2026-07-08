# Pattern Machine

A browser-based generative drum machine with Radiohead-inspired (RH) and
Drum & Bass (D&B) rhythm generation. Extracted from a single-file Claude.ai
widget into a Vite project per `PATTERN_MACHINE_HANDOFF.md`.

## Run it

```sh
npm install
npm run dev
```

## Layout

- `src/main.js` — entry point: app state, UI assembly, event wiring
- `src/engine/` — `scheduler.js` (look-ahead Web Audio clock), `synth.js`
  (kick/snare/hat voices), `sampler.js` (WAV load + playback), `tracks.js`
  (track state model, LENS table)
- `src/algo/` — `rh.js` and `dnb.js` (probability models), `sparse.js`
  (THIN knob suppress/re-roll logic)
- `src/ui/` — `knob.js` (SVG knob with pointer capture), `stepgrid.js`,
  `controls.js`
- `styles/main.css`

## Controls

- **LEN knob** — drag vertically to set pattern length (4–32 steps); tracks
  with different lengths drift polyrhythmically
- **THIN knob** — drag to suppress a random subset of active steps (dashed
  teal); click without dragging to re-roll which steps are suppressed
- **MUTE** — silences the track, playhead keeps running
- **LOAD** — replace the synthesized voice with a WAV file
- **⟳** — re-randomize just that track
- Global: BPM (40–220), time signature (4/4, 3/4, 5/4, 6/8, 7/8), RH/D&B
  mode toggle (auto-nudges BPM), randomize all, play/stop
- Click any step to toggle it manually

## Note on the probability models

`hpRH` and `hpDNB` were reconstructed from the probability values documented
in the handoff, not copied from the original v8 widget source (which lives in
the originating Claude.ai conversation). They follow the documented anchors —
e.g. RH kick 0.93 on beat 1, D&B snare 0.95 on step 8 — but the fallback and
ghost-note branches are interpretations. To restore exact parity, paste the
original function bodies into `src/algo/rh.js` and `src/algo/dnb.js`.

## Roadmap (from handoff, in priority order)

1. Pattern save/load (JSON + localStorage)
2. Swing knob
3. Per-step velocity
4. Pattern chaining
5. More genre modes (Jungle, Hip-hop)
6. Web MIDI output
7. WAV export via OfflineAudioContext

Hardware (Teensy 4.1) and JUCE VST paths are documented in
`PATTERN_MACHINE_HANDOFF.md`. An alternative M5Stack Dial build with
concentric step-rings — one ring per track, polyrhythm you can see — is
sketched in `HARDWARE_DIAL.md`.
