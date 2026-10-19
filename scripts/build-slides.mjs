/**
 * content/<test>/source/<id>.<jpg|png> + content/<test>/pictures.json -> public/<test>/<id>.jpg
 * for PPDT (D33) and TAT (D36).
 *
 *   msedge --headless=new --remote-debugging-port=9333 --user-data-dir=<tmp> about:blank
 *   npm run ppdtslides   |   npm run tatslides
 *
 * Each picture is made into an SSB-style slide in the browser's own canvas, so
 * there is no image package: a photo is greyed, softened and given low
 * contrast, grain and a vignette, its haze rising with difficulty, and any
 * `mask` (a number plate) blurred hard; a sketch is cropped to the drawing and
 * softened lightly. A TAT drawing is cropped and its lines darkened a little:
 * many are faint scans that wash out once enlarged. 1024 px wide, JPEG. The
 * same source and settings make the same slide. Any Chromium works over CDP
 * (CDP_URL, default http://127.0.0.1:9333).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const TEST = process.argv[2];
if (TEST !== 'ppdt' && TEST !== 'tat') {
  console.error('Usage: node scripts/build-slides.mjs ppdt|tat');
  process.exit(2);
}
const CDP = process.env.CDP_URL ?? 'http://127.0.0.1:9333';
const { pictures } = JSON.parse(readFileSync(`content/${TEST}/pictures.json`, 'utf8'));

let target;
try {
  target = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
} catch {
  console.error(`No browser at ${CDP}. Start one: msedge --headless=new --remote-debugging-port=9333 --user-data-dir=<tmp> about:blank`);
  process.exit(2);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); });
const send = (method, params = {}) => new Promise((res, rej) => {
  const n = ++id;
  pending.set(n, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
  ws.send(JSON.stringify({ id: n, method, params }));
});

/** Runs in the page: the source as a data URL and the picture's processing, back as a JPEG data URL. */
const MAKE = `async (src, p) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const [sx, sy, sw, sh] = p.kind === 'photo' ? [0, 0, img.width, img.height] : p.crop;
  const W = 1024, H = Math.round(sh * W / sw);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.filter = p.kind === 'sketch'
    ? 'grayscale(1) contrast(0.92) brightness(1.03) blur(' + p.blur + 'px)'
    : p.kind === 'drawing'
      ? 'grayscale(1) contrast(1.15) brightness(0.96) blur(' + p.blur + 'px)'
      : 'grayscale(1) contrast(' + p.contrast + ') brightness(1.06) blur(' + p.blur + 'px)';
  g.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  g.filter = 'none';
  if (p.kind === 'photo') {
    if (p.mask) {
      const [mx, my, mw, mh] = [p.mask[0] * W, p.mask[1] * H, p.mask[2] * W, p.mask[3] * H];
      g.save(); g.beginPath(); g.rect(mx, my, mw, mh); g.clip();
      g.filter = 'grayscale(1) blur(14px)'; g.drawImage(img, sx, sy, sw, sh, 0, 0, W, H); g.restore();
    }
    // Grain, seeded so the same photo always makes the same slide.
    const d = g.getImageData(0, 0, W, H); let s = 7;
    const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
    for (let i = 0; i < d.data.length; i += 4) { const k = (r() - 0.5) * 22; d.data[i] += k; d.data[i + 1] += k; d.data[i + 2] += k; }
    g.putImageData(d, 0, 0);
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.28)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  return c.toDataURL('image/jpeg', 0.82).split(',')[1];
}`;

for (const p of pictures) {
  const ext = existsSync(`content/${TEST}/source/${p.id}.png`) ? 'png' : 'jpg';
  const src = `data:image/${ext === 'png' ? 'png' : 'jpeg'};base64,${readFileSync(`content/${TEST}/source/${p.id}.${ext}`).toString('base64')}`;
  // A TAT picture's processing has no kind: every one is a line drawing.
  const processing = TEST === 'tat' ? { kind: 'drawing', ...p.processing } : p.processing;
  const r = await send('Runtime.evaluate', {
    expression: `(${MAKE})(${JSON.stringify(src)}, ${JSON.stringify(processing)})`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) throw new Error(`${p.id}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
  const out = Buffer.from(r.result.value, 'base64');
  writeFileSync(`public/${TEST}/${p.id}.jpg`, out);
  console.log(`public/${TEST}/${p.id}.jpg  ${Math.round(out.length / 1024)} KB  ${p.difficulty}  ${p.title}`);
}
ws.close();
