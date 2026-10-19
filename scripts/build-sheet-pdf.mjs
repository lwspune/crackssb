/**
 * A blank answer sheet as a real PDF: public/<test>-sheet.pdf for PPDT (D33)
 * and TAT (D36), by printing our own /sheets/<test> page in the browser — no
 * PDF package.
 *
 *   npm run build && npx next start -p 3100
 *   msedge --headless=new --remote-debugging-port=9333 --user-data-dir=<tmp> about:blank
 *   npm run ppdtsheet [-- http://localhost:3100]   |   npm run tatsheet
 *
 * Re-run when the sheet's layout changes. Any Chromium works over CDP (CDP_URL).
 */
import { writeFileSync } from 'node:fs';

const TEST = process.argv[2];
if (TEST !== 'ppdt' && TEST !== 'tat') {
  console.error('Usage: node scripts/build-sheet-pdf.mjs ppdt|tat [base url]');
  process.exit(2);
}
const BASE = process.argv[3] ?? 'http://localhost:3100';
const CDP = process.env.CDP_URL ?? 'http://127.0.0.1:9333';

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

await send('Page.enable');
await send('Emulation.setEmulatedMedia', { media: 'print', features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await send('Page.navigate', { url: `${BASE}/sheets/${TEST}` });
await new Promise((r) => setTimeout(r, 3000));
const { data } = await send('Page.printToPDF', {
  paperWidth: 8.27, paperHeight: 11.69, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
  printBackground: true, preferCSSPageSize: true,
});
const pdf = Buffer.from(data, 'base64');
writeFileSync(`public/${TEST}-sheet.pdf`, pdf);
ws.close();
console.log(`public/${TEST}-sheet.pdf  ${Math.round(pdf.length / 1024)} KB`);
