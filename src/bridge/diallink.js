// WebSocket link to an M5 Dial pod (firmware/m5dial-pod). The dial hosts the
// server; we connect as a client, push full state on any change, and stream
// playhead positions. The dial sends back edit events (toggle/play/stop/rand).

export function createDialLink(getState, handlers) {
  let ws = null;
  let retryTimer = null;
  let sendTimer = null;
  let url = localStorage.getItem('dialUrl') || '';
  let wanted = false;
  let status = 'off'; // off | wait | on

  const setStatus = (s) => {
    status = s;
    if (handlers.onStatus) handlers.onStatus(s);
  };

  function open() {
    if (!wanted || !url) return;
    try {
      ws = new WebSocket(url);
    } catch {
      setStatus('off');
      return;
    }
    ws.onopen = () => {
      setStatus('on');
      ws.send(JSON.stringify(getState())); // immediate — sync the pod on connect
    };
    ws.onclose = () => {
      ws = null;
      if (wanted) {
        setStatus('wait');
        retryTimer = setTimeout(open, 3000);
      }
    };
    ws.onerror = () => { if (ws) ws.close(); };
    ws.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'toggle') handlers.toggle(m.tr, m.st);
      else if (m.t === 'play') handlers.play();
      else if (m.t === 'stop') handlers.stop();
      else if (m.t === 'rand') handlers.rand(m.tr);
    };
  }

  // Debounced full-state push (knob drags fire this rapidly).
  function sendState() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    clearTimeout(sendTimer);
    sendTimer = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(getState()));
      }
    }, 60);
  }

  function sendPlayhead(tr, st) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ t: 'ph', tr, st }));
    }
  }

  function connect(u) {
    url = u;
    localStorage.setItem('dialUrl', u);
    localStorage.setItem('dialOn', '1');
    wanted = true;
    clearTimeout(retryTimer);
    setStatus('wait');
    if (ws) ws.close();
    else open();
  }

  function disconnect() {
    wanted = false;
    localStorage.removeItem('dialOn');
    clearTimeout(retryTimer);
    if (ws) ws.close();
    setStatus('off');
  }

  // relink automatically if a dial was connected last session
  if (url && localStorage.getItem('dialOn') === '1') {
    wanted = true;
    queueMicrotask(() => {
      if (wanted) {
        setStatus('wait');
        open();
      }
    });
  }

  return {
    connect,
    disconnect,
    sendState,
    sendPlayhead,
    get status() { return status; },
    get url() { return url; },
    get active() { return wanted; },
  };
}
