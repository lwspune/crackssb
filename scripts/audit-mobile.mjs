/**
 * Mobile audit — run against a live build before calling UI work done.
 *
 *   npm run build && npm start                     # app on :3000
 *   msedge --headless=new --remote-debugging-port=9333 --user-data-dir=<tmp> about:blank
 *   npm run audit:mobile [-- http://localhost:3000]
 *
 * At 320, 360 and 390 px (the phones candidates actually carry) it checks
 * every student page for sideways scroll, tap targets under 44 px and text
 * under 12 px, then starts a WAT and shrinks the viewport the way an
 * on-screen keyboard does, and checks the word, the field and the clock are
 * still on screen. Exits 1 on any finding. Any Chromium works over CDP
 * (CDP_URL, default http://127.0.0.1:9333). No dependency: Node's own
 * fetch and WebSocket.
 */

const BASE = process.argv[2] ?? 'http://localhost:3000';
const CDP = process.env.CDP_URL ?? 'http://127.0.0.1:9333';
const PAGES = ['/', '/practise', '/olq', '/results', '/profile', '/run/wat'];
const WIDTHS = [320, 360, 390];
const KEYBOARD_UP = [[360, 380], [320, 330]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

async function view(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
}
async function go(path) {
  await send('Page.navigate', { url: BASE + path });
  for (let i = 0; i < 40; i++) { await sleep(150); if ((await evaluate('document.readyState')) === 'complete') break; }
  await evaluate('document.fonts.ready.then(() => true)');
  await sleep(400);
}

// Measured in the live layout: what overflows, what a thumb would miss, what is too small to read.
const AUDIT = `(() => {
  const vw = window.innerWidth;
  const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('.sr-only'); };
  const overflow = document.documentElement.scrollWidth - vw;
  // A control inside a <label> is hit anywhere on the label — the browser routes the tap — so measure that.
  const hitBox = (e) => (e.closest('label') ?? e).getBoundingClientRect();
  const small = [...document.querySelectorAll('a[href], button, input, [role=button]')].filter(visible)
    .filter((e) => { const r = hitBox(e); return r.width < 44 || r.height < 44; })
    .map((e) => { const r = e.getBoundingClientRect(); return (e.textContent.trim().slice(0, 24) || e.getAttribute('aria-label') || e.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); });
  const tiny = [...document.querySelectorAll('body *')].filter(visible)
    .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
    .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12)
    .map((e) => e.textContent.trim().slice(0, 20) + ' ' + getComputedStyle(e).fontSize);
  return { overflow, small: [...new Set(small)], tiny: [...new Set(tiny)] };
})()`;

const FIT = `(() => {
  const vh = window.innerHeight;
  const box = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; };
  const parts = { clock: box('[role=timer]'), word: box('main p.text-5xl'), field: box('#runner-input') };
  const [, clockBottom] = parts.clock;
  const [wordTop] = parts.word;
  return { vh, parts, inView: Object.values(parts).every(([t, b]) => t >= 0 && b <= vh), gap: wordTop - clockBottom };
})()`;

const findings = [];
try {
  await go('/');
  await evaluate('localStorage.clear(), true');
  for (const width of WIDTHS) {
    await view(width, 740);
    for (const path of PAGES) {
      await go(path);
      const r = await evaluate(AUDIT);
      const issues = [
        r.overflow > 0 && `scrolls sideways by ${r.overflow}px`,
        r.small.length && `tap targets under 44px: ${r.small.join(' | ')}`,
        r.tiny.length && `text under 12px: ${r.tiny.join(' | ')}`,
      ].filter(Boolean);
      console.log(`${width}px ${path}: ${issues.length ? issues.join(' ; ') : 'ok'}`);
      for (const i of issues) findings.push(`${width}px ${path}: ${i}`);
    }
  }

  for (const [w, h] of KEYBOARD_UP) {
    await view(w, 740);
    await go('/run/wat');
    await evaluate('localStorage.clear(), true');
    await go('/run/wat');
    await evaluate(`[...document.querySelectorAll('button')].find((b) => /Begin/.test(b.textContent)).click(), true`);
    await sleep(600);
    await view(w, h);
    await sleep(400);
    const f = await evaluate(FIT);
    const issues = [!f.inView && 'word, field or clock off screen', f.gap < 12 && `word crowds the clock row (${f.gap}px apart)`].filter(Boolean);
    console.log(`runner, keyboard up @ ${w}x${h}: ${issues.length ? issues.join(' ; ') : 'ok'} ${JSON.stringify(f.parts)}`);
    for (const i of issues) findings.push(`runner @ ${w}x${h}: ${i}`);
  }
  await evaluate('localStorage.clear(), true');
} finally {
  ws.close();
}

console.log(findings.length ? `\n${findings.length} finding(s).` : '\nMobile audit clean.');
process.exit(findings.length ? 1 : 0);
