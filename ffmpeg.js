// Alles rund um ffmpeg, ohne Electron, damit es separat testbar ist.
const { spawn } = require('child_process');
const fs = require('fs');

const FPS = 25;
const AUDIO = 'highpass=f=120,lowpass=f=6000,acompressor=threshold=0.15:ratio=4,volume=2.2';
const even = (n) => Math.max(2, Math.round(n / 2) * 2);

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => { err = (err + d).slice(-8000); });
    p.on('error', reject);
    p.on('close', (code) => resolve({ code, err }));
  });
}

async function probe(bin, file) {
  const { err } = await run(bin, ['-hide_banner', '-i', file]);
  const v = err.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
  if (!v) throw new Error('Diese Datei enthält kein lesbares Video.');
  const d = err.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return {
    width: +v[1],
    height: +v[2],
    duration: d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : 0,
    audio: /Audio:/.test(err),
  };
}

// Vorschau in kleinem, gut abspielbarem Format (funktioniert auch mit AVI).
async function makePreview(bin, file, out, info, codec = 'h264') {
  const a = ['-y', '-v', 'error', '-i', file, '-vf', 'scale=-2:\'min(480,ih)\',format=yuv420p', '-r', String(FPS)];
  if (codec === 'h264') a.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-g', '12');
  else a.push('-c:v', 'libvpx', '-b:v', '2M', '-g', '12');
  if (info.audio) a.push('-c:a', codec === 'h264' ? 'aac' : 'libvorbis', '-b:a', '128k', '-ar', '44100');
  a.push(out);
  const { code, err } = await run(bin, a);
  if (code !== 0) throw new Error('Die Vorschau konnte nicht erstellt werden: ' + err.slice(-300));
  return out;
}

class ExportJob {
  constructor(bin, src, out, info) {
    this.h = even(Math.min(info.height, 1080));
    this.w = even(info.width * (this.h / info.height));
    this.frameSize = this.w * this.h * 4;
    this.frames = Math.ceil(info.duration * FPS) || 0;
    this.out = out;
    this.tmp = out + '.tmp.mp4';
    this.dec = spawn(bin, ['-v', 'error', '-i', src, '-vf', `fps=${FPS},scale=${this.w}:${this.h},format=rgba`,
      '-f', 'rawvideo', '-'], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    const audio = info.audio ? ['-map', '1:a', '-af', AUDIO, '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-shortest'] : [];
    this.enc = spawn(bin, ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${this.w}x${this.h}`,
      '-r', String(FPS), '-i', '-', '-i', src, '-map', '0:v', ...audio, '-vf', 'vflip', '-c:v', 'libx264',
      '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', this.tmp],
      { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
    this.err = '';
    this.enc.stderr.on('data', (d) => { this.err = (this.err + d).slice(-4000); });
    this.enc.stdin.on('error', () => {});
    this.chunks = []; this.have = 0; this.ended = false; this.wait = null;
    this.dec.stdout.on('data', (d) => {
      this.chunks.push(d); this.have += d.length;
      if (this.have >= this.frameSize * 2) this.dec.stdout.pause();
      this.wake();
    });
    this.dec.stdout.on('end', () => { this.ended = true; this.wake(); });
    this.dec.on('error', () => { this.ended = true; this.wake(); });
  }
  wake() { if (this.wait) { const w = this.wait; this.wait = null; w(); } }
  async next() {
    while (this.have < this.frameSize && !this.ended) await new Promise((r) => { this.wait = r; });
    if (this.have < this.frameSize) return null;
    const all = Buffer.concat(this.chunks);
    const frame = all.subarray(0, this.frameSize);
    const rest = all.subarray(this.frameSize);
    this.chunks = rest.length ? [rest] : []; this.have = rest.length;
    if (this.dec.stdout.isPaused()) this.dec.stdout.resume();
    return frame;
  }
  put(buf) {
    return new Promise((resolve) => {
      if (this.enc.stdin.write(Buffer.from(buf))) resolve();
      else this.enc.stdin.once('drain', resolve);
    });
  }
  finish() {
    return new Promise((resolve, reject) => {
      this.enc.on('close', (code) => {
        if (code === 0) { fs.renameSync(this.tmp, this.out); resolve(this.out); }
        else { fs.rmSync(this.tmp, { force: true }); reject(new Error('Der Export ist fehlgeschlagen: ' + this.err.slice(-300))); }
      });
      this.enc.stdin.end();
    });
  }
  cancel() {
    this.dec.kill(); this.enc.kill();
    this.enc.once('close', () => fs.rmSync(this.tmp, { force: true }));
  }
}

module.exports = { FPS, probe, makePreview, ExportJob, run };
