// WebSerial link to an M5 Dial pod over USB-C — same JSON protocol as the
// WebSocket link, newline-delimited. Chrome/Edge only (navigator.serial).

export function createSerialLink(getState, handlers) {
  const supported = 'serial' in navigator;
  let port = null;
  let writer = null;
  let sendTimer = null;
  let pingTimer = null;
  let wanted = false;
  let status = 'off'; // off | wait | on

  const enc = new TextEncoder();

  const setStatus = (s) => {
    status = s;
    if (handlers.onStatus) handlers.onStatus(s);
  };

  function write(obj) {
    if (!writer) return;
    writer.write(enc.encode(JSON.stringify(obj) + '\n')).catch(() => {});
  }

  async function openPort(p) {
    setStatus('wait');
    try {
      await p.open({ baudRate: 115200 });
    } catch {
      setStatus('off');
      wanted = false;
      return;
    }
    port = p;
    writer = p.writable.getWriter();
    localStorage.setItem('usbOn', '1');
    setStatus('on');
    write(getState()); // sync the pod immediately
    pingTimer = setInterval(() => write({ t: 'ping' }), 2000); // keeps the pod's link indicator alive
    readLoop();
  }

  async function readLoop() {
    const dec = new TextDecoder();
    let buf = '';
    try {
      const reader = port.readable.getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          let m;
          try { m = JSON.parse(line); } catch { continue; }
          if (m.t === 'toggle') handlers.toggle(m.tr, m.st);
          else if (m.t === 'play') handlers.play();
          else if (m.t === 'stop') handlers.stop();
          else if (m.t === 'rand') handlers.rand(m.tr);
        }
      }
    } catch {
      // fallthrough: device unplugged or read error
    }
    teardown();
  }

  function teardown() {
    clearInterval(pingTimer);
    clearTimeout(sendTimer);
    if (writer) { writer.releaseLock(); writer = null; }
    if (port) { port.close().catch(() => {}); port = null; }
    setStatus('off');
  }

  async function connect() {
    if (!supported) return;
    wanted = true;
    try {
      const p = await navigator.serial.requestPort(); // needs the click gesture
      await openPort(p);
    } catch {
      wanted = false;
      setStatus('off');
    }
  }

  function disconnect() {
    wanted = false;
    localStorage.removeItem('usbOn');
    teardown();
  }

  function sendState() {
    if (!writer) return;
    clearTimeout(sendTimer);
    sendTimer = setTimeout(() => write(getState()), 60);
  }

  function sendPlayhead(tr, st) {
    if (writer) write({ t: 'ph', tr, st });
  }

  // reconnect to an already-granted port from last session
  if (supported && localStorage.getItem('usbOn') === '1') {
    navigator.serial.getPorts().then((ports) => {
      if (ports.length && !port) {
        wanted = true;
        openPort(ports[0]);
      }
    });
  }

  return {
    supported,
    connect,
    disconnect,
    sendState,
    sendPlayhead,
    get status() { return status; },
    get active() { return wanted; },
  };
}
