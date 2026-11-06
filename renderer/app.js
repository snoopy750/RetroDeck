const GROUPS = [
  ['SIGNAL', [['sharp', 'Schärfe'], ['bleed', 'Color Bleed'], ['shift_', 'Farbversatz'], ['over', 'Überschärfen']]],
  ['BAND', [['noise_', 'Rauschen'], ['jitter', 'Zeilenzittern'], ['track', 'Tracking-Fehler'], ['drop_', 'Dropouts']]],
  ['BILD', [['scan', 'Scanlines'], ['head', 'Head-Switching'], ['flick', 'Flimmern'], ['vig', 'Vignette']]],
  ['FARBE', [['sat', 'Sättigung'], ['hue', 'Farbton'], ['con', 'Kontrast'], ['pop', 'Pop-Stärke']]],
];
const base = { sharp: 62, bleed: 70, shift_: 45, over: 35, noise_: 35, jitter: 30, track: 12, drop_: 18, scan: 30, head: 55, flick: 15, vig: 25, sat: 50, hue: 50, con: 50, pop: 0 };
const PRESETS = [
  { name: 'Original VHS', cols: ['#8d8f96', '#6f8f84', '#b9a08a'], v: { ...base, sat: 42 } },
  { name: 'VHS Knallig', cols: ['#e8293a', '#26b34a', '#2a5bff'], v: { ...base, sat: 76, con: 56, bleed: 78, shift_: 55, noise_: 30 } },
  { name: 'Camcorder 90er', cols: ['#ff7a3c', '#ffd98a', '#7fb8ff'], v: { ...base, sat: 68, hue: 47, con: 54, sharp: 52, over: 50, noise_: 28, jitter: 22, vig: 20 } },
  { name: 'Musikvideo', cols: ['#ff2e93', '#ffd400', '#00c2ff'], v: { ...base, sat: 90, con: 64, bleed: 88, shift_: 70, scan: 40, noise_: 22, track: 6 } },
  { name: 'Heimvideo Warm', cols: ['#3a1a0e', '#c9783a', '#ffe7b0'], v: { ...base, sat: 66, hue: 45, con: 52, sharp: 45, noise_: 38, flick: 25, vig: 35, pop: 12 } },
  { name: '80er Pop', cols: ['#1a0a4a', '#ff2e93', '#ffd400'], v: { ...base, sat: 78, con: 58, pop: 55, noise_: 25 } },
  { name: 'Synthwave', cols: ['#2b0a5e', '#ff2fa0', '#27e0ff'], v: { ...base, sat: 70, con: 60, pop: 75, scan: 45, vig: 40 } },
  { name: 'Miami', cols: ['#0d5c63', '#ff6fb5', '#fff1c1'], v: { ...base, sat: 72, con: 54, pop: 60, bleed: 55 } },
  { name: 'Kaputtes Band', cols: ['#10131c', '#a6a06a', '#d9d9d9'], v: { ...base, sharp: 35, noise_: 70, jitter: 65, track: 70, drop_: 65, head: 85, flick: 50, sat: 35, pop: 20 } },
  { name: 'Eigene Farben', cols: ['#1d3bff', '#ff5a1f', '#f7f73a'], v: { ...base, sat: 70, pop: 65 }, own: true },
];
const $ = (id) => document.getElementById(id);
const store = { get() { try { return JSON.parse(localStorage.getItem('retrodeck') || 'null'); } catch { return null; } }, set(v) { try { localStorage.setItem('retrodeck', JSON.stringify(v)); return true; } catch { return false; } } };
const START = PRESETS.findIndex((p) => p.name === 'VHS Knallig');
let vals = { ...PRESETS[START].v }, cols = [...PRESETS[START].cols], split = false, activePreset = START, media = null, busy = false, cancel = false;
const knobs = {};

function setKnob(k, v) {
  v = Math.max(0, Math.min(100, Math.round(v))); vals[k] = v;
  const o = knobs[k]; o.d.style.setProperty('--v', v); o.i.style.transform = `rotate(${-135 + v * 2.7}deg)`; o.s.textContent = v; o.d.setAttribute('aria-valuenow', v);
}
function buildKnobs() {
  for (const [title, items] of GROUPS) {
    const sec = document.createElement('section'); sec.innerHTML = `<h3>${title}</h3><div class="row"></div>`;
    for (const [k, label] of items) {
      const w = document.createElement('div'); w.className = 'k';
      w.innerHTML = `<div class="d" role="slider" tabindex="0" aria-label="${label}" aria-valuemin="0" aria-valuemax="100"><i></i></div><b>${label}</b><span></span>`;
      const d = w.firstChild; knobs[k] = { d, i: d.firstChild, s: w.lastChild };
      let y0 = 0, v0 = 0;
      d.addEventListener('pointerdown', (e) => { d.setPointerCapture(e.pointerId); y0 = e.clientY; v0 = vals[k]; });
      d.addEventListener('pointermove', (e) => { if (d.hasPointerCapture(e.pointerId)) setKnob(k, v0 + (y0 - e.clientY) * (e.shiftKey ? .15 : .6)); });
      d.addEventListener('wheel', (e) => { e.preventDefault(); setKnob(k, vals[k] + (e.deltaY < 0 ? 2 : -2)); }, { passive: false });
      d.addEventListener('dblclick', () => setKnob(k, PRESETS[activePreset]?.v[k] ?? base[k]));
      d.addEventListener('keydown', (e) => { const s = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key]; if (s) { e.preventDefault(); setKnob(k, vals[k] + s); } });
      sec.lastChild.append(w);
    }
    $('panel').append(sec);
  }
}
function applyPreset(p, i) {
  activePreset = i; if (p.fps) setFps(p.fps); Object.keys(p.v).forEach((k) => setKnob(k, p.v[k])); cols = [...p.cols];
  [...$('presets').children].forEach((b, j) => b.classList.toggle('on', j === i));
  $('own').hidden = !p.own; ['c0', 'c1', 'c2'].forEach((id, n) => { $(id).value = cols[n]; });
}
function buildPresets() {
  $('presets').textContent = '';
  const list = [...PRESETS]; const s = store.get(); if (s) list.push({ name: 'Gespeichert', ...s, own: true });
  list.forEach((p, i) => { const b = document.createElement('button'); b.innerHTML = `<em style="background:linear-gradient(90deg,${p.cols.join(',')})"></em>`; b.append(p.name); b.onclick = () => applyPreset(p, i); $('presets').append(b); });
  window._list = list;
}

// WebGL
const canvas = $('c');
const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: false, antialias: false, alpha: false, powerPreference: 'high-performance' });
if (!gl) $('status').textContent = 'WebGL 2 ist nicht verfügbar. Aktualisiere den Grafiktreiber und starte RetroDeck neu.';
function sh(t, s) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, window.VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, window.FRAG)); gl.linkProgram(prog); gl.useProgram(prog);
gl.bindVertexArray(gl.createVertexArray());
const uCache = {}; const U = (n) => uCache[n] ?? (uCache[n] = gl.getUniformLocation(prog, n));
function tex(unit) { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, p, v); return t; }
tex(0); tex(1); gl.uniform1i(U('uV'), 0); gl.uniform1i(U('uO'), 1);
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);

// Beispielbild, solange kein Video offen ist
function demo() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 480; const x = c.getContext('2d');
  let g = x.createLinearGradient(0, 0, 0, 320); [[0, '#27105c'], [.55, '#8a1d8f'], [.8, '#ff4f8b'], [1, '#ffb13d']].forEach(([a, b]) => g.addColorStop(a, b)); x.fillStyle = g; x.fillRect(0, 0, 640, 320);
  x.fillStyle = '#ffe14d'; x.beginPath(); x.arc(320, 240, 95, Math.PI, 0); x.lineTo(415, 320); x.lineTo(225, 320); x.fill();
  x.fillStyle = '#ff5fa2'; for (let y = 200; y < 320; y += 24) x.fillRect(220, y, 200, 7);
  x.fillStyle = '#120a2c'; x.fillRect(0, 320, 640, 160); x.strokeStyle = '#3fe0e0'; x.lineWidth = 2;
  for (let i = -10; i <= 10; i++) { x.beginPath(); x.moveTo(320 + i * 24, 320); x.lineTo(320 + i * 130, 480); x.stroke(); }
  for (let i = 0; i < 6; i++) { const y = 320 + 160 * (i / 6) ** 1.7; x.beginPath(); x.moveTo(0, y); x.lineTo(640, y); x.stroke(); }
  return c;
}
const demoC = demo();
function upload(src, w, h) { gl.activeTexture(gl.TEXTURE0); if (src instanceof Uint8Array) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, src); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); }

// PLAY-Anzeige als Ebene unter den Effekten
const osdC = document.createElement('canvas'); osdC.width = 640; osdC.height = 480; const osdX = osdC.getContext('2d'); let osdKey = '';
function drawOsd(text) {
  const key = $('osd').checked ? text : ''; if (key === osdKey) return; osdKey = key; osdX.clearRect(0, 0, 640, 480);
  if (key) { osdX.font = 'bold 26px Consolas, "DejaVu Sans Mono", monospace'; osdX.fillStyle = '#fff'; osdX.textAlign = 'left'; osdX.fillText('▶ PLAY', 28, 44); osdX.textAlign = 'right'; osdX.fillText(key, 612, 44); }
  gl.activeTexture(gl.TEXTURE1); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, osdC);
}
const stamp = (t) => `SP ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function render(t, sp) {
  for (const k in vals) gl.uniform1f(U(k), vals[k] / 100);
  gl.uniform1f(U('uT'), t); gl.uniform1f(U('uFps'), fps); gl.uniform1f(U('uSplit'), sp ? 1 : 0); gl.uniform2f(U('uR'), canvas.width, canvas.height);
  gl.uniform3fv(U('uC0'), hex(cols[0])); gl.uniform3fv(U('uC1'), hex(cols[1])); gl.uniform3fv(U('uC2'), hex(cols[2]));
  gl.viewport(0, 0, canvas.width, canvas.height); gl.drawArrays(gl.TRIANGLES, 0, 3);
}
const vid = document.createElement('video'); vid.playsInline = true; vid.preload = 'auto'; vid.loop = true;
let audioReady = false;
function audioChain() { // Ton wie vom Band auch in der Vorschau
  if (audioReady) return; audioReady = true;
  try { const a = new AudioContext(), s = a.createMediaElementSource(vid), hp = a.createBiquadFilter(), lp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 120; lp.type = 'lowpass'; lp.frequency.value = 6000; s.connect(hp).connect(lp).connect(a.destination); } catch { /* Vorschau bleibt ohne Filter */ }
}
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const start = performance.now();
// Vorschau mit 25 Bildern/s, Video nur hochladen, wenn ein neues Bild da ist
let lastDraw = 0, dirty = true, shown = null, fps = 25;
const setFps = (v) => { fps = Math.max(5, Math.min(60, +v || 25)); $('fps').value = fps; $('fpsV').textContent = fps; };
if (vid.requestVideoFrameCallback) { const vf = () => { dirty = true; vid.requestVideoFrameCallback(vf); }; vid.requestVideoFrameCallback(vf); }
function loop(now) {
  requestAnimationFrame(loop); if (busy || now - lastDraw < 1000 / fps - 4) return; lastDraw = now;
  const hasV = media && vid.readyState >= 2, s = hasV ? vid : demoC;
  if (dirty || s !== shown || !vid.requestVideoFrameCallback) { upload(s); shown = s; dirty = false; }
  drawOsd(stamp(hasV ? vid.currentTime : 5));
  render(hasV ? vid.currentTime + (vid.paused ? (performance.now() - start) / 1000 : 0) : (performance.now() - start) / 1000, split);
  if (hasV) { const d = vid.duration || 0; if (document.activeElement !== $('seek')) $('seek').value = d ? vid.currentTime / d * 1000 : 0; $('time').textContent = `${fmt(vid.currentTime)} / ${fmt(d)}`; }
}

async function open(path) {
  $('status').textContent = 'Video wird vorbereitet ...'; $('exp').disabled = true;
  try {
    const r = await window.api.load(path);
    if (media) URL.revokeObjectURL(media.url);
    const url = URL.createObjectURL(new Blob([r.data], { type: r.type || 'video/mp4' }));
    vid.src = url; dirty = true; media = { url, name: r.name, info: r.info };
    await new Promise((res, rej) => { vid.onloadeddata = res; vid.onerror = () => rej(new Error('Die Vorschau lässt sich nicht abspielen.')); });
    canvas.width = Math.round(vid.videoWidth / vid.videoHeight * 480 / 2) * 2; canvas.height = 480;
    ['play', 'seek', 'exp'].forEach((id) => { $(id).disabled = false; });
    $('status').textContent = `${r.name}, ${r.info.width} × ${r.info.height}, ${fmt(r.info.duration)}`;
  } catch (e) { $('status').textContent = e.message; throw e; }
}
async function doExport(fixedOut) {
  vid.pause(); $('play').textContent = '▶';
  const job = await window.api.exportStart(fixedOut, fps); if (!job) return null;
  busy = true; cancel = false; $('ov').hidden = false; $('ovT').textContent = 'Export läuft'; $('ovP').value = 0;
  const pw = canvas.width, ph = canvas.height, pix = new Uint8Array(job.w * job.h * 4);
  canvas.width = job.w; canvas.height = job.h; const t0 = performance.now(); let i = 0;
  try {
    for (;;) {
      if (cancel) { await window.api.exportCancel(); $('status').textContent = 'Export abgebrochen.'; return null; }
      const buf = await window.api.exportNext(); if (!buf) break;
      const t = i / fps; upload(new Uint8Array(buf), job.w, job.h); drawOsd(stamp(t)); render(t, false);
      gl.readPixels(0, 0, job.w, job.h, gl.RGBA, gl.UNSIGNED_BYTE, pix); await window.api.exportPut(pix.slice().buffer); i++;
      if (i % 5 === 0) { $('ovP').value = job.frames ? Math.min(1, i / job.frames) : 0; const sp = i / fps / ((performance.now() - t0) / 1000); $('ovS').textContent = `${i} / ${job.frames} Bilder, ${sp.toFixed(1)}-fache Echtzeit`; await new Promise((r) => setTimeout(r)); }
    }
    const out = await window.api.exportFinish(); $('status').textContent = `Gespeichert: ${out}`; window.api.reveal(out); return out;
  } catch (e) { $('status').textContent = e.message; throw e; } finally { busy = false; dirty = true; $('ov').hidden = true; canvas.width = pw; canvas.height = ph; }
}

$('open').onclick = async () => { const p = await window.api.pick(); if (p) open(p).catch(() => {}); };
$('play').onclick = () => { audioChain(); if (vid.paused) { vid.play(); $('play').textContent = '❚❚'; } else { vid.pause(); $('play').textContent = '▶'; } };
$('seek').oninput = (e) => { if (vid.duration) vid.currentTime = e.target.value / 1000 * vid.duration; };
$('cmp').onclick = () => { split = !split; $('cmp').classList.toggle('on', split); };
$('save').onclick = () => { $('status').textContent = store.set({ v: { ...vals }, cols: [...cols], fps }) ? 'Einstellungen gespeichert.' : 'Speichern ist fehlgeschlagen.'; buildPresets(); [...$('presets').children].at(-1).click(); };
$('exp').onclick = () => doExport().catch(() => {});
$('fps').oninput = (e) => setFps(e.target.value);
$('ovC').onclick = () => { cancel = true; };
['c0', 'c1', 'c2'].forEach((id, n) => { $(id).oninput = (e) => { cols[n] = e.target.value; }; });
addEventListener('dragover', (e) => { e.preventDefault(); $('drop').hidden = false; });
addEventListener('dragleave', (e) => { if (!e.relatedTarget) $('drop').hidden = true; });
addEventListener('drop', (e) => { e.preventDefault(); $('drop').hidden = true; const f = e.dataTransfer.files[0]; if (f) open(window.api.pathOf(f)).catch(() => {}); });
addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.target.closest('.d,button,input') && !$('play').disabled) { e.preventDefault(); $('play').click(); } });

buildKnobs(); buildPresets(); applyPreset(PRESETS[START], START); requestAnimationFrame(loop);
const dbg = gl.getExtension('WEBGL_debug_renderer_info');
if (dbg && /swiftshader|llvmpipe|software/i.test(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))) $('status').textContent = 'Die Grafikkarte wird nicht genutzt, darum ist die Prozessorlast hoch. Aktualisiere den Grafiktreiber.';
window.api.onSelftest(async ({ input, output }) => {
  try { await open(input); await doExport(output); await window.api.selftestDone(true, 'ok'); } catch (e) { await window.api.selftestDone(false, String(e)); }
});
window._rd = { setFps, open, doExport, applyPreset, PRESETS, vid };
