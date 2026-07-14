# m5dial-pod — Pattern Machine track pod

Single M5Stack Dial prototype of the multi-pod concept in `../../HARDWARE_DIAL.md`.
The dial shows one track as a ring of steps; the Pattern Machine web app
connects to it over WebSocket and does all the audio. Think "one quarter of a
monome arc, with a screen."

## Controls

| Gesture | Action |
|---|---|
| Rotate | move cursor around the ring |
| Click | toggle step under cursor |
| Double-click | re-roll (randomize) the viewed track |
| Hold (500 ms) | switch to next track |
| Touch center | play / stop |

Ring colors match the web app: track color = active, dark = off, teal
outline = THIN-suppressed, red = playhead. Dots at the bottom show which of
the four tracks you're viewing.

## Build & flash (Arduino IDE or arduino-cli)

Libraries: `M5Dial`, `WiFiManager`, `ArduinoJson` (same set as the EcoFlow
dial) plus [`WebSockets` by Markus Sattler](https://github.com/Links2004/arduinoWebSockets) (links2004), v2.7.x.

Board: **M5Dial** (`esp32:esp32:m5stack_dial`), or ESP32S3 Dev Module with the
same settings as the EcoFlow dial project. Either way, set Partition Scheme to
**Huge APP** — the sketch overflows the default app partition.

```sh
arduino-cli compile --fqbn esp32:esp32:m5stack_dial --board-options PartitionScheme=huge_app firmware/m5dial-pod
arduino-cli upload  --fqbn esp32:esp32:m5stack_dial -p /dev/cu.usbmodem* firmware/m5dial-pod
```

## First run

1. The dial opens a `PatternPod-Setup` captive portal if it has no WiFi
   credentials (same WiFiManager flow as the EcoFlow dial). Join it from your
   phone and enter your network.
2. The dial then shows its address, e.g. `ws://192.168.1.42:81`
   (`ws://patternpod.local:81` also works via mDNS on the same network).
3. In the web app (`npm run dev`), click **DIAL** and enter that address.
   The button turns teal when linked; the pod says `WEB LINKED`.
4. Edit steps from either side — they stay in sync. Press play on either side;
   sound comes from the browser.

## Protocol (JSON over WebSocket, dial = server on port 81)

Web → dial: `{"t":"state", bpm, playing, tracks:[{n, len, steps:[0/1…], sparse:[idx…]}]}`
and `{"t":"ph", tr, st}` per step for playhead sweep.

Dial → web: `{"t":"toggle", tr, st}`, `{"t":"play"}`, `{"t":"stop"}`,
`{"t":"rand", tr}`. The web app is the source of truth — it applies the edit
and echoes full state back.

## Known prototype limits

- Single-click toggle has ~350 ms latency (M5Unified waits to rule out a
  double-click). Fine for editing; worth revisiting if it annoys.
- LEN/THIN aren't editable from the dial yet — next step is hold+rotate
  parameter mode per `../../HARDWARE_DIAL.md`.
- No mute from the dial.
