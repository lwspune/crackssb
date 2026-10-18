import { describe, it, expect } from 'vitest';
import { readXlsx, writeXlsx } from '../xlsx.ts';
import { readZip } from '../zip.ts';

/** The first sheet of a workbook, as rows of cells: text as strings, numbers as numbers. */
describe('xlsx', () => {
  it('reads back the rows it writes, first sheet only', async () => {
    const book = writeXlsx([
      { name: 'People', rows: [['Name', 'Email'], ['Cadet <One> & Co', 'one@example.com']], textColumns: true, freezeHeader: true },
      { name: 'How to fill', rows: [['Not this one']] },
    ]);
    expect(await readXlsx(book)).toEqual([['Name', 'Email'], ['Cadet <One> & Co', 'one@example.com']]);
  });

  it('writes a workbook Excel opens: content types, workbook, styles and each sheet', async () => {
    const files = await readZip(writeXlsx([{ name: 'People', rows: [['A']] }, { name: 'Help', rows: [['B']] }]));
    expect([...files.keys()].sort()).toEqual([
      '[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml',
    ]);
  });

  it('keeps empty cells in their columns', async () => {
    const book = writeXlsx([{ name: 'S', rows: [['a', '', 'c'], ['', 'b']] }]);
    expect(await readXlsx(book)).toEqual([['a', null, 'c'], [null, 'b']]);
  });
});
