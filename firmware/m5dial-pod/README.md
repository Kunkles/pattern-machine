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

## Connecting — USB (simplest) or WiFi

**USB-C:** plug the dial into the computer, open the web app in Chrome/Edge
(`npm run dev`), click **USB**, and pick the `usbmodem` port. Done — no WiFi
setup needed. Note: the web app holds the serial port, so click USB again to
disconnect before reflashing firmware.

**WiFi:** hold the encoder button while powering on to open the
`PatternPod-Setup` captive portal (same WiFiManager flow as the EcoFlow dial)
and join it from a phone. Once on your network the dial shows its address,
e.g. `ws://192.168.1.42:81` (`ws://patternpod.local:81` also works via mDNS).
Click **DIAL** in the web app and enter it.

Either way the button turns teal when linked and the pod says `USB LINKED` /
`WEB LINKED`. Edit steps from either side — they stay in sync. Press play on
either side; sound comes from the browser.

## Protocol (same JSON both ways: WebSocket on :81, or newline-delimited over USB CDC)

Web → dial: `{"t":"state", bpm, playing, tracks:[{n, len, steps:[0/1…], sparse:[idx…]}]}`,
`{"t":"ph", tr, st}` per step for playhead sweep, and `{"t":"ping"}` (dial
answers `{"t":"pong"}`; any received line keeps the USB link indicator alive).

Dial → web: `{"t":"toggle", tr, st}`, `{"t":"play"}`, `{"t":"stop"}`,
`{"t":"rand", tr}`. The web app is the source of truth — it applies the edit
and echoes full state back.

## Known prototype limits

- Single-click toggle has ~350 ms latency (M5Unified waits to rule out a
  double-click). Fine for editing; worth revisiting if it annoys.
- LEN/THIN aren't editable from the dial yet — next step is hold+rotate
  parameter mode per `../../HARDWARE_DIAL.md`.
- No mute from the dial.
