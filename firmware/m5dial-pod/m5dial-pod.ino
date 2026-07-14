/*
  m5dial-pod.ino — Pattern Machine track pod (single-dial prototype)

  One M5Stack Dial shows one track as a ring of steps, synced live to the
  Pattern Machine web app (https://github.com/Kunkles/pattern-machine).
  The dial hosts a WebSocket server; the browser connects to it, pushes
  pattern state, and streams playhead positions. The browser does all audio —
  the dial is a control surface.

  Rotate           move cursor around the ring   (4 ticks per detent)
  Click            toggle step under cursor
  Double-click     re-roll (randomize) this track
  Hold (500 ms)    switch to next track
  Touch center     play / stop

  On boot the dial joins WiFi (captive portal on first run, same flow as the
  EcoFlow dial) and shows its ws:// address — enter that in the web app's
  DIAL button.
*/

#include "M5Dial.h"
#include <WiFi.h>
#include <WiFiManager.h>
#include <ESPmDNS.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

#define WS_PORT     81
#define MDNS_NAME   "patternpod"
#define SETUP_SSID  "PatternPod-Setup"
#define NTRACKS     4
#define MAXLEN      32
#define ENC_DETENT  4   // 4 ticks per detent on this encoder

struct Track {
  const char *name;
  uint16_t    color;
  uint8_t     len = 16;
  bool        steps[MAXLEN]  = {};
  bool        sparse[MAXLEN] = {};
};

Track   tracks[NTRACKS];
uint8_t viewTrack = 0;
int     cursorStep = 0;
int     playhead[NTRACKS] = { -1, -1, -1, -1 };
bool    playing = false;
int     bpm = 118;

WebSocketsServer ws(WS_PORT);
M5Canvas canvas(&M5Dial.Display);

bool dirty = true;
long lastEnc = 0;

uint16_t C_BG, C_OFF, C_DIM, C_TEXT, C_TEAL, C_RED, C_WHITE;

// ── WebSocket ────────────────────────────────────────────────────────────────

bool webConnected() { return ws.connectedClients() > 0; }

void sendJson(JsonDocument &doc) {
  String out;
  serializeJson(doc, out);
  ws.broadcastTXT(out);
}

void sendToggle(uint8_t tr, uint8_t st) {
  JsonDocument d;
  d["t"] = "toggle"; d["tr"] = tr; d["st"] = st;
  sendJson(d);
}

void sendSimple(const char *type, int tr = -1) {
  JsonDocument d;
  d["t"] = type;
  if (tr >= 0) d["tr"] = tr;
  sendJson(d);
}

void handleMsg(uint8_t *payload, size_t len) {
  JsonDocument doc;
  if (deserializeJson(doc, payload, len)) return;
  const char *t = doc["t"] | "";

  if (!strcmp(t, "ph")) {
    int tr = doc["tr"] | 0, st = doc["st"] | 0;
    if (tr < NTRACKS) {
      playhead[tr] = st;
      if (tr == viewTrack) dirty = true;
    }
  } else if (!strcmp(t, "state")) {
    bpm     = doc["bpm"] | bpm;
    playing = doc["playing"] | false;
    JsonArray trs = doc["tracks"];
    for (int i = 0; i < NTRACKS && i < (int)trs.size(); i++) {
      JsonObject o = trs[i];
      tracks[i].len = constrain((int)(o["len"] | 16), 1, MAXLEN);
      JsonArray st = o["steps"];
      for (int s = 0; s < MAXLEN; s++)
        tracks[i].steps[s] = s < (int)st.size() ? (bool)(int)st[s] : false;
      memset(tracks[i].sparse, 0, sizeof(tracks[i].sparse));
      for (int idx : o["sparse"].as<JsonArray>())
        if (idx >= 0 && idx < MAXLEN) tracks[i].sparse[idx] = true;
    }
    if (!playing) memset(playhead, -1, sizeof(playhead));
    if (cursorStep >= tracks[viewTrack].len) cursorStep = 0;
    dirty = true;
  }
}

void onWsEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t len) {
  switch (type) {
    case WStype_CONNECTED:
    case WStype_DISCONNECTED: dirty = true; break;
    case WStype_TEXT:         handleMsg(payload, len); break;
    default: break;
  }
}

// ── Display ──────────────────────────────────────────────────────────────────

void drawRing() {
  Track &tk = tracks[viewTrack];
  float seg = 360.0f / tk.len;
  float gap = min(4.0f, seg * 0.2f);

  for (int i = 0; i < tk.len; i++) {
    float a0 = -90 + i * seg + gap / 2;
    float a1 = -90 + (i + 1) * seg - gap / 2;
    bool isPh = playing && playhead[viewTrack] == i;

    uint16_t fill = C_OFF;
    if (isPh)                       fill = C_RED;
    else if (tk.steps[i] && tk.sparse[i]) fill = C_BG;
    else if (tk.steps[i])           fill = tk.color;

    canvas.fillArc(120, 120, 96, 112, a0, a1, fill);
    if (tk.steps[i] && tk.sparse[i] && !isPh) {  // THIN-suppressed: teal outline
      canvas.drawArc(120, 120, 96, 112, a0, a1, C_TEAL);
    }
    if (i == cursorStep)  // cursor sits just outside the ring
      canvas.fillArc(120, 120, 114, 119, a0, a1, C_WHITE);
  }
}

void drawCenter() {
  Track &tk = tracks[viewTrack];
  canvas.setTextDatum(middle_center);

  canvas.setFont(&fonts::Font4);
  canvas.setTextColor(tk.color, C_BG);
  canvas.drawString(tk.name, 120, 78);

  canvas.setFont(&fonts::Font2);
  canvas.setTextColor(C_TEXT, C_BG);
  canvas.drawString(String(bpm) + " BPM", 120, 104);

  if (playing) canvas.fillRect(112, 122, 16, 16, C_TEAL);            // stop square
  else canvas.fillTriangle(114, 120, 114, 140, 132, 130, tk.color);  // play arrow

  canvas.setTextColor(webConnected() ? C_TEAL : C_DIM, C_BG);
  canvas.drawString(webConnected() ? "WEB LINKED" : "NO WEB", 120, 156);
  if (!webConnected()) {
    canvas.setTextColor(C_DIM, C_BG);
    canvas.drawString("ws://" + WiFi.localIP().toString() + ":81", 120, 172);
  }

  for (int i = 0; i < NTRACKS; i++)  // track indicator dots
    canvas.fillCircle(102 + i * 12, 190, 3, i == viewTrack ? tracks[i].color : C_DIM);
}

void draw() {
  canvas.fillScreen(C_BG);
  drawRing();
  drawCenter();
  canvas.pushSprite(0, 0);
  dirty = false;
}

// ── Input ────────────────────────────────────────────────────────────────────

void handleInput() {
  Track &tk = tracks[viewTrack];

  long enc = M5Dial.Encoder.read();
  long delta = enc - lastEnc;
  if (abs(delta) >= ENC_DETENT) {
    int dir = delta > 0 ? 1 : -1;
    lastEnc = enc;
    cursorStep = (cursorStep + dir + tk.len) % tk.len;
    M5Dial.Speaker.tone(4000, 8);
    dirty = true;
  }

  if (M5Dial.BtnA.wasClicked()) {  // toggle step
    tk.steps[cursorStep] = !tk.steps[cursorStep];
    tk.sparse[cursorStep] = false;
    sendToggle(viewTrack, cursorStep);
    M5Dial.Speaker.tone(tk.steps[cursorStep] ? 5500 : 2500, 12);
    dirty = true;
  }

  if (M5Dial.BtnA.wasDoubleClicked()) {  // re-roll this track (web echoes state)
    sendSimple("rand", viewTrack);
    M5Dial.Speaker.tone(3000, 25);
  }

  if (M5Dial.BtnA.wasHold()) {  // next track
    viewTrack = (viewTrack + 1) % NTRACKS;
    cursorStep = min((int)cursorStep, tracks[viewTrack].len - 1);
    M5Dial.Speaker.tone(4500, 15);
    dirty = true;
  }

  auto t = M5Dial.Touch.getDetail();
  static bool touched = false;
  bool inCenter = abs(t.x - 120) < 55 && abs(t.y - 120) < 55;
  if (t.isPressed() && inCenter && !touched) {
    touched = true;
    sendSimple(playing ? "stop" : "play");  // web echoes playing state back
    M5Dial.Speaker.tone(playing ? 2000 : 6000, 20);
  }
  if (!t.isPressed()) touched = false;
}

// ── Setup / loop ─────────────────────────────────────────────────────────────

void setup() {
  auto cfg = M5.config();
  M5Dial.begin(cfg, true, false);  // enable encoder, no RFID
  M5Dial.Display.setBrightness(120);

  C_BG    = M5Dial.Display.color565(0x12, 0x14, 0x1a);
  C_OFF   = M5Dial.Display.color565(0x26, 0x2a, 0x36);
  C_DIM   = M5Dial.Display.color565(0x6b, 0x70, 0x80);
  C_TEXT  = M5Dial.Display.color565(0xc8, 0xcc, 0xd8);
  C_TEAL  = M5Dial.Display.color565(0x2d, 0xd4, 0xbf);
  C_RED   = M5Dial.Display.color565(0xef, 0x44, 0x44);
  C_WHITE = TFT_WHITE;

  tracks[0] = { "KICK",   M5Dial.Display.color565(0xf5, 0xa6, 0x23) };
  tracks[1] = { "SNARE",  C_RED };
  tracks[2] = { "HI-HAT", C_TEAL };
  tracks[3] = { "CL HAT", M5Dial.Display.color565(0xa7, 0x8b, 0xfa) };

  canvas.setPsram(true);
  canvas.createSprite(240, 240);

  M5Dial.Display.setTextDatum(middle_center);
  M5Dial.Display.setFont(&fonts::Font2);
  M5Dial.Display.drawString("WiFi: join " SETUP_SSID, 120, 110);
  M5Dial.Display.drawString("if setup is needed", 120, 130);

  WiFiManager wm;
  wm.setConfigPortalTimeout(180);
  wm.autoConnect(SETUP_SSID);

  MDNS.begin(MDNS_NAME);
  MDNS.addService("ws", "tcp", WS_PORT);

  ws.begin();
  ws.onEvent(onWsEvent);

  lastEnc = M5Dial.Encoder.read();
}

void loop() {
  M5Dial.update();
  ws.loop();
  handleInput();
  if (dirty) draw();
  delay(5);
}
