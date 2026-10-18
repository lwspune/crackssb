import { readZip, writeZip } from './zip.ts';

/**
 * Just enough of the .xlsx format for the people upload (D31 §8): write a
 * small workbook of text cells; read the first sheet's cells back as text or
 * numbers (a date typed into an ordinary cell arrives as a number — the
 * caller knows which column holds dates). Formulas are read as their saved
 * value. Pure apart from unzipping; the XML is read by pattern, so it runs
 * the same in the browser and in tests.
 */

export type Cell = string | number | null;

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function unesc(s: string): string {
  return s
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, (_, e: string) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }[e as 'lt']!;
    });
}

/** "AB12" → 27 (zero-based column). */
function column(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

const letter = (i: number): string => (i >= 26 ? letter(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26));

export interface SheetSpec {
  readonly name: string;
  readonly rows: readonly (readonly string[])[];
  /** Format every column as Text, so a typed date or phone stays as typed. */
  readonly textColumns?: boolean;
  /** Bold, frozen first row. */
  readonly freezeHeader?: boolean;
  /** Column widths in characters. */
  readonly widths?: readonly number[];
}

function sheetXml(spec: SheetSpec): string {
  const width = Math.max(1, ...spec.rows.map((r) => r.length));
  const views = spec.freezeHeader
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '';
  const cols = Array.from({ length: width }, (_, i) => {
    const w = spec.widths?.[i] ?? 22;
    return `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"${spec.textColumns ? ' style="1"' : ''}/>`;
  }).join('');
  const rows = spec.rows
    .map((r, ri) => {
      const header = spec.freezeHeader && ri === 0;
      const cells = r
        .map((v, ci) => (v === '' ? '' : `<c r="${letter(ci)}${ri + 1}" t="inlineStr"${header ? ' s="2"' : spec.textColumns ? ' s="1"' : ''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`))
        .join('');
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join('');
  return `${XML}<worksheet xmlns="${MAIN}">${views}<sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${rows}</sheetData></worksheet>`;
}

const STYLES = `${XML}<styleSheet xmlns="${MAIN}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export function writeXlsx(sheets: readonly SheetSpec[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const file = (name: string, text: string) => ({ name, data: enc.encode(text) });
  const n = sheets.length;
  return writeZip([
    file(
      '[Content_Types].xml',
      `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join('')}</Types>`,
    ),
    file('_rels/.rels', `${XML}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    file(
      'xl/workbook.xml',
      `${XML}<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    ),
    file(
      'xl/_rels/workbook.xml.rels',
      `${XML}<Relationships xmlns="${PKG}">${sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join('')}<Relationship Id="rId${n + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    ),
    file('xl/styles.xml', STYLES),
    ...sheets.map((s, i) => file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s))),
  ]);
}

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

/** The text of an <si> or <is>: every <t>, run by run. */
const runs = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)].map((m) => unesc(m[1] ?? '')).join('');

/** The first sheet's rows. Trailing empty cells are dropped; a gap inside a row is null. */
export async function readXlsx(bytes: Uint8Array): Promise<Cell[][]> {
  const files = await readZip(bytes);
  const text = (name: string) => {
    const f = files.get(name);
    return f ? new TextDecoder().decode(f) : null;
  };

  const workbook = text('xl/workbook.xml');
  if (!workbook) throw new Error('This is not an .xlsx file.');
  const first = /<(?:\w+:)?sheet\s[^>]*>/.exec(workbook)?.[0] ?? '';
  const rid = /\sr:id="([^"]*)"/.exec(first)?.[1];
  const rels = text('xl/_rels/workbook.xml.rels') ?? '';
  const rel = [...rels.matchAll(/<Relationship\s[^>]*>/g)].map((m) => m[0]).find((r) => attr(r, 'Id') === rid);
  const target = rel ? attr(rel, 'Target') ?? '' : 'worksheets/sheet1.xml';
  const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
  const sheet = text(path);
  if (!sheet) throw new Error('This workbook has no sheet to read.');

  const shared = [...(text('xl/sharedStrings.xml') ?? '').matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g)].map((m) => runs(m[1] ?? ''));

  const out: Cell[][] = [];
  for (const rm of sheet.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = Number(attr(rm[1], 'r') ?? out.length + 1) - 1;
    const row: Cell[] = [];
    for (const cm of (rm[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(cm[1], 'r');
      const ci = ref ? column(ref) : row.length;
      const type = attr(cm[1], 't');
      const body = cm[2] ?? '';
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value: Cell = null;
      if (type === 'inlineStr') value = runs(/<is>([\s\S]*?)<\/is>/.exec(body)?.[1] ?? '');
      else if (type === 's') value = v === undefined ? null : shared[Number(v)] ?? null;
      else if (type === 'str' || type === 'e') value = v === undefined ? null : unesc(v);
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else if (v !== undefined && v !== '') value = Number(v);
      if (value === '') value = null;
      while (row.length < ci) row.push(null);
      row[ci] = value;
    }
    while (row.length > 0 && row[row.length - 1] === null) row.pop();
    while (out.length < r) out.push([]);
    out[r] = row;
  }
  return out;
}
