const { app, BrowserWindow, dialog, ipcMain, shell, Menu, protocol } = require('electron');
const { Readable } = require('stream');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { probe, makePreview, ExportJob } = require('./ffmpeg');

const ffmpegBin = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
const idx = process.argv.indexOf('--selftest');
const selftest = idx >= 0 ? { input: process.argv[idx + 1], output: process.argv[idx + 2] } : null;
if (selftest) { // Build-Rechner haben keine Grafikkarte
  app.commandLine.appendSwitch('use-angle', 'swiftshader');
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
}

protocol.registerSchemesAsPrivileged([{ scheme: 'rdmedia', privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true } }]);

let win, current = null, job = null;
const served = new Map();
function serve(file) {
  const id = crypto.randomBytes(8).toString('hex');
  served.set(id, file);
  return `rdmedia://${id}/video`;
}
// Liefert Videos stückweise von der Festplatte, darum muss nichts in den Arbeitsspeicher
function mediaResponse(req) {
  const file = served.get(new URL(req.url).hostname);
  if (!file) return new Response('', { status: 404 });
  const size = fs.statSync(file).size;
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range') || '');
  const start = m ? +m[1] : 0, end = m && m[2] ? Math.min(+m[2], size - 1) : size - 1;
  return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), {
    status: m ? 206 : 200,
    headers: { 'Content-Type': /\.webm$/i.test(file) ? 'video/webm' : 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${size}`, 'Access-Control-Allow-Origin': '*' },
  });
}
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'retrodeck-'));

function create() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1320, height: 800, minWidth: 960, minHeight: 620, backgroundColor: '#17151c',
    show: !selftest, title: 'RetroDeck',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  if (selftest) win.webContents.once('did-finish-load', () => win.webContents.send('selftest', selftest));
}

ipcMain.handle('pick', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [
    { name: 'Videos', extensions: ['avi', 'mp4', 'mov', 'mkv', 'webm', 'mts', 'm2ts', 'wmv', 'mpg', 'mpeg', 'm4v', '3gp'] },
    { name: 'Alle Dateien', extensions: ['*'] }] });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('load', async (_e, file) => {
  const info = await probe(ffmpegBin, file);
  current = { file, info };
  return { name: path.basename(file), info, url: info.direct ? serve(file) : await proxy() };
});
ipcMain.handle('load-proxy', () => proxy());

async function proxy() {
  const out = path.join(tmpDir, `preview-${Date.now()}.mp4`);
  await makePreview(ffmpegBin, current.file, out, current.info, 'h264', (v) => win.webContents.send('progress', v));
  return serve(out);
}

ipcMain.handle('export-start', async (_e, fixedOut, fps) => {
  if (!current) throw new Error('Öffne zuerst ein Video.');
  let out = fixedOut;
  if (!out) {
    const def = path.join(path.dirname(current.file), path.parse(current.file).name + '_RETRO.mp4');
    const r = await dialog.showSaveDialog(win, { defaultPath: def, filters: [{ name: 'MP4-Video', extensions: ['mp4'] }] });
    if (r.canceled) return null;
    out = r.filePath;
  }
  job = new ExportJob(ffmpegBin, current.file, out, current.info, fps);
  return { w: job.w, h: job.h, frames: job.frames };
});
ipcMain.handle('export-next', async () => {
  const f = await job.next();
  return f ? f.buffer.slice(f.byteOffset, f.byteOffset + f.length) : null;
});
ipcMain.handle('export-put', (_e, buf) => job.put(buf));
ipcMain.handle('export-finish', async () => { const o = await job.finish(); job = null; return o; });
ipcMain.handle('export-cancel', () => { if (job) job.cancel(); job = null; });
ipcMain.handle('reveal', (_e, p) => shell.showItemInFolder(p));
ipcMain.handle('selftest-done', (_e, ok, msg) => {
  if (msg) console.log(msg);
  app.exit(ok ? 0 : 1);
});

app.whenReady().then(() => { protocol.handle('rdmedia', mediaResponse); create(); });
app.on('window-all-closed', () => app.quit());
app.on('quit', () => {
  if (job) job.cancel();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
