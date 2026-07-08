# Pattern Machine — Claude Code Handoff

## Project overview

A browser-based generative drum machine with Radiohead-inspired and Drum & Bass rhythm generation. Built iteratively in Claude.ai as a single-file HTML widget. Ready to be extracted into a proper project structure, extended, and optionally compiled to hardware (Teensy 4.1) or a VST plugin (JUCE).

---

## Current feature set (as of handoff)

### Tracks
- 4 tracks: Kick, Snare, Hi-Hat, Closed Hi-Hat
- Each track has:
  - **LEN knob** — drag up/down to set pattern length (steps from: 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32). Tracks can have different lengths, creating polyrhythmic drift.
  - **THIN knob** — drag to suppress a random subset of active steps without deleting them. Click the knob (without dragging) to re-roll which steps are suppressed. Dashed teal outline shows suppressed steps.
  - **MUTE button** — silences the track; playhead continues so it re-enters in time on unmute
  - **LOAD button** — loads a WAV file via file picker; replaces synthesized sound for that track
  - **⟳ button** — re-randomizes just that track's pattern

### Global controls
- **BPM slider** — 40–220 BPM
- **Time signature selector** — 4/4, 3/4, 5/4, 6/8, 7/8
- **Mode toggle** — RH (Radiohead) or D&B (Drum & Bass)
- **Randomize all** — regenerates all four tracks using the active mode's algorithm
- **Play/Stop**

### Audio
- Synthesized fallbacks when no WAV loaded:
  - Kick: oscillator with pitch envelope (155Hz → ~0, 450ms decay)
  - Snare: filtered noise (HP 900Hz, 140ms)
  - Hi-Hat: filtered noise (HP 7000Hz, 280ms)
  - Closed Hat: filtered noise (HP 7200Hz, 40ms)
- D&B mode uses tighter envelopes (kick 180Hz, snare HP 1200Hz, shorter decays)
- WAV playback via Web Audio API `decodeAudioData` + `AudioBufferSourceNode`

### Rhythm generation algorithms

#### Radiohead mode (`hpRH`)
Probability function driven by beat position within the time signature. Parameters:
- `bs` = beat size derived from time sig (4/4→4, 3/4→3, 5/4→5, 6/8→3, 7/8→7)
- `beatNum` = which beat in the bar
- `beatPos` = position within the beat
- `half` = midpoint of beat (`Math.round(bs/2)`)

Kick: anchors on beat 1 (0.93), downbeats (0.50), halfway through beat (0.24), triplet ghosts (0.18)
Snare: targets backbeats (beat 2, 4, etc. — 0.82), displaced backbeats (0.32), ghosts at 25% of beat (0.14)
Hi-Hat: offbeat emphasis (halfway through beat — 0.65), downbeat (0.28), 16ths (0.20)
Closed Hat: simple alternating density (0.72 / 0.36)

#### D&B mode (`hpDNB`)
Operates on a fixed 16-step bar grid regardless of time signature.
- `bar` = `i % 16`
- `beat` = `Math.floor(bar / 4)`
- `sub` = `bar % 4`

Kick: beat 1 (0.95), "and of 2" step 6 (0.75), "and of 3" step 10 (0.55), pickup step 14 (0.50), various syncopations
Snare: half-time crack on step 8 / beat 3 (0.95), ghosts around it
Hi-Hat: dense rolling — offbeats (0.75), all 16ths active, second half of bar denser
Closed Hat: gap-filler pattern, rolls harder in bar's second half

BPM auto-nudges: switching to D&B mode bumps BPM to 170 if below 140; switching to RH brings it to 118 if above 150.

### Step grid display
- Steps rendered as small divs
- Beat group separator: visual gap before every `bs`-th step
- States: off (empty), on (amber), muted-by-THIN (dashed teal), playhead-current (red)
- Click any step to manually toggle it

### Knob interaction
- `pointerdown` → `setPointerCapture` → `pointermove` / `pointerup` on the SVG element
- Drag threshold: 3px vertical movement before registering as drag
- If no drag on THIN knob's pointerup → treated as click → reshuffle
- Drag sensitivity: 150px travel = full 0→1 range
- On THIN pointerdown: `initSparseOrder()` is always called to seed the random order immediately

### Scheduler
- `setInterval` at 25ms polling Web Audio clock
- Look-ahead: 100ms (`AHEAD = 0.1`)
- Step duration: `60 / bpm / 4` seconds (16th note at current BPM)
- Each track's playhead is independent (`t.si % klen(t.kv)`)
- Visual sync: `setTimeout` fires at the calculated audio time offset to update step highlight

---

## Bugs / known issues

- No mobile touch support for knobs (pointer events should cover it but untested on iOS)
- No pattern save/recall
- No swing/shuffle
- Scheduler is browser-clock based — jitter possible under CPU load
- D&B mode ignores time signature for rhythm generation (by design, but worth noting)

---

## Suggested project structure for Claude Code

```
pattern-machine/
├── index.html
├── src/
│   ├── main.js              # entry point, builds UI, wires events
│   ├── engine/
│   │   ├── scheduler.js     # Web Audio clock, step firing
│   │   ├── synth.js         # kick, snare, hat synthesis
│   │   ├── sampler.js       # WAV load + playback
│   │   └── tracks.js        # track state model
│   ├── ui/
│   │   ├── knob.js          # reusable SVG knob with pointer capture
│   │   ├── stepgrid.js      # step button row renderer
│   │   └── controls.js      # BPM, time sig, mode, global buttons
│   └── algo/
│       ├── rh.js            # Radiohead probability function
│       ├── dnb.js           # D&B probability function
│       └── sparse.js        # THIN knob — initSparseOrder, applySparse
├── styles/
│   └── main.css
└── README.md
```

---

## Immediate next features (priority order)

1. **Pattern save/load** — JSON export/import of full state (steps, knob values, mode, BPM, time sig). LocalStorage for quick recall.
2. **Swing** — global swing amount knob that delays every odd 16th note by 0–50% of a step duration
3. **Per-step velocity** — click+drag on an active step to set 0–1 velocity; synth/sampler use it as gain multiplier
4. **Pattern chain** — 2–4 pattern slots, cycle through them every N bars
5. **Additional genre modes** — Jungle (similar to D&B but more breakbeat-weighted), Hip-hop (heavy 2-and-4 snare, slower kick density)
6. **MIDI output** — Web MIDI API, one channel per track, note numbers configurable
7. **Export** — render current pattern to WAV (offline AudioContext)

---

## Hardware path (Teensy 4.1)

If taking this to hardware, the web UI goes away entirely. Everything runs in C++ on bare metal.

### Target hardware
- Teensy 4.1 (600MHz ARM Cortex-M7, 1MB RAM)
- PJRC Audio Shield (SGTL5000 codec, SD card, I2S)
- 4× EC11 rotary encoders with push (one per track, LEN/THIN toggle on push)
- 2× larger encoders for BPM and time sig
- ILI9341 2.8" TFT color display (SPI)
- MCP23017 I2C expander for step buttons (4×8 = 32 buttons with RGB LEDs via NeoTrellis)
- MCP4728 I2C DAC → TL074 op-amp → 4× CV out jacks (0–10V)
- 74AHCT125 level shifter → 4× gate out jacks (5V)

### C++ architecture
```
PatternMachine/
├── PatternMachine.ino
├── src/
│   ├── Scheduler.h/.cpp       # interrupt-driven step clock
│   ├── Track.h/.cpp           # pattern state, sparse mute logic
│   ├── RhythmAlgo.h/.cpp      # port of hpRH and hpDNB
│   ├── SynthVoices.h/.cpp     # AudioSynthSimpleDrum + noise gen
│   ├── Sampler.h/.cpp         # AudioPlaySdWav wrapper
│   ├── Encoders.h/.cpp        # EC11 polling, push detection
│   ├── Display.h/.cpp         # ILI9341 step grid + knob values
│   ├── CVGate.h/.cpp          # MCP4728 I2C + GPIO gate fires
│   └── NeoTrellis.h/.cpp      # Adafruit NeoTrellis step buttons
```

### Audio library patch (PJRC)
```cpp
// In audio design tool or manually:
AudioSynthSimpleDrum    kick;
AudioSynthSimpleDrum    snare;
AudioSynthNoisePink     hatNoise;
AudioFilterBiquad       hatFilter;
AudioPlaySdWav          wav[4];   // one per track for loaded samples
AudioMixer4             mixer;
AudioOutputI2S          i2s;
```

### Encoder interaction model
- Push encoder: toggle between LEN and THIN mode for that track
- Hold encoder (>500ms): re-randomize that track
- Rotate in LEN mode: step through LENS array [4,6,8,10,12,14,16,20,24,28,32]
- Rotate in THIN mode: increment/decrement muted count, trigger reshuffle each detent

---

## JUCE VST path

For a DAW plugin, keep the JS UI running in a `WebBrowserComponent` and write a thin C++ audio backend.

### Architecture
- `PluginProcessor.cpp` — audio thread, sample playback, step scheduling via `AudioPlayHead`
- `PluginEditor.cpp` — hosts `WebBrowserComponent`, registers JS↔C++ bridge
- JS bridge events:
  - JS → C++: `{type: "stepFired", track: 0, step: 3}` → triggers voice
  - JS → C++: `{type: "bpmChanged", bpm: 118}` → updates internal BPM
  - C++ → JS: `{type: "playhead", step: 7, track: 2}` → updates visual playhead
- Pattern state lives in JS; audio state lives in C++
- Plugin state save/recall: serialize JS pattern to JSON, store in `AudioProcessorValueTreeState`

### Targets
- VST3: Windows, Mac, Linux
- AU: Mac only (Logic, GarageBand)
- AAX: Pro Tools only (requires iLok/Avid approval)

---

## Key decisions to make before starting

1. **Bundler?** Vite is the obvious choice for the web version. Zero-config, fast HMR, good for audio worklets if you go that route later.
2. **TypeScript?** The algo and scheduler logic would benefit from types. The knob/UI layer is simple enough either way.
3. **Web Audio Worklet?** Current scheduler uses `setInterval` + look-ahead which is fine but an `AudioWorkletProcessor` would give sample-accurate timing. Worth it if jitter is audible.
4. **Hardware encoder count?** 4 encoders (push to toggle LEN/THIN) vs 8 encoders (dedicated LEN + THIN per track) changes the panel layout significantly. The 4-encoder push-toggle approach is more compact and more interesting to play.

---

## Source — complete current widget code

The full working implementation lives in the Claude.ai conversation. To extract it, ask Claude to output the raw HTML source of the v8 widget (the D&B version with mute buttons). It is a single self-contained HTML fragment with no external dependencies — Web Audio API only.

Key functions to preserve exactly as-is when refactoring:
- `hpRH(id, i, len, bs)` — the Radiohead probability model
- `hpDNB(id, i, len, bs)` — the D&B probability model  
- `initSparseOrder(t)` + `applySparse(t)` — the THIN knob logic
- `setupKnob(svg, ti, type)` — pointer capture drag interaction
- `sched()` — the look-ahead scheduler loop

---

*Handoff generated from Pattern Machine conversation — Claude.ai, July 2026*
