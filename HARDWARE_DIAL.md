# Pattern Machine Dial — concentric-ring hardware concept

Alternative hardware path to the Teensy 4.1 panel in `PATTERN_MACHINE_HANDOFF.md`:
run the sequencer on an **M5Stack Dial** (ESP32-S3, 1.28" round 240×240 GC9A01
display, rotary encoder with push, capacitive touch, buzzer) — the same unit as
the [pipboy-ecoflow-dial-remote](https://github.com/Kunkles/pipboy-ecoflow-dial-remote)
project, so the encoder handling, M5Dial/M5GFX setup, NVS persistence, and
captive-portal WiFi provisioning all port over.

## Why a round display is the right canvas

The signature feature of Pattern Machine is per-track pattern lengths drifting
against each other. On a linear grid that's abstract; on concentric rings it's
literal:

- **One ring per track** (kick outermost → closed hat innermost, at radii
  ~104 / 84 / 64 / 44 px).
- Each ring is divided into that track's step count — a 16-step kick ring next
  to a 10-step snare ring *looks* polyrhythmic at a glance.
- **Per-ring playheads** sweep like radar hands, each at its own angular rate
  (same step duration, different steps-per-revolution). Phase drift between
  tracks is directly visible as the hands fan apart.
- Step states map straight from the web UI: amber filled arc = on, dashed teal
  arc = THIN-suppressed, red = playhead.

## Interaction model (one encoder + touch)

- **Touch a ring** → select that track (highlight ring).
- **Rotate** → move step cursor around the selected ring.
- **Click** → toggle step under cursor.
- **Hold (>500 ms) + rotate** → parameter mode for the selected track:
  successive holds cycle LEN → THIN → (release to exit). Detents step through
  the LENS array / THIN percentage, mirroring the web knobs.
- **Touch center** → transport (play/stop); **double-tap center** → randomize
  all; **long-press center** → BPM/mode/time-sig menu (rotate to adjust).
- THIN re-roll (the "click the knob" gesture in the web app) = click while in
  THIN parameter mode.

## Sound output options

The M5 Dial has no audio codec — a buzzer only — so unlike the Teensy path it
is a *sequencer*, not a synth, unless you add a DAC:

1. **USB-MIDI** (TinyUSB device mode on the S3) — plug into a laptop/DAW,
   zero extra hardware. Simplest first milestone.
2. **WiFi bridge to the web app** — WebSocket sync where the dial is the
   control surface and the browser does the Web Audio playback. Reuses the
   captive-portal setup flow from the EcoFlow dial.
3. **I2S DAC on the Grove port** (e.g. MAX98357A) — standalone sound with the
   synth voices ported to fixed-point C++; the probability models in
   `src/algo/` are pure functions and port directly.

## Open questions

- Inner rings get cramped below ~24 steps of resolution at r=44; may cap inner
  tracks' LEN or swap track→ring assignment so long patterns sit outside.
- Encoder detent count vs. step count: fine cursor moves on a 32-step outer
  ring may want 2 detents/step.
- Battery: the Dial's internal cell is small; fine for a desk toy, needs USB
  power for sessions.
