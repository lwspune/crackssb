import { describe, it, expect } from 'vitest';
import { crc32, readZip, writeZip } from '../zip.ts';

/**
 * The zip container an .xlsx file is. Written uncompressed (stored), read
 * stored or deflated with the platform's own DecompressionStream — no package.
 */
const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

describe('crc32', () => {
  it('matches the standard check value', () => {
    expect(crc32(enc('123456789'))).toBe(0xcbf43926);
  });
});

describe('zip', () => {
  it('reads back what it writes, names and bytes', async () => {
    const zip = writeZip([{ name: 'a.txt', data: enc('hello') }, { name: 'dir/b.xml', data: enc('<x>é</x>') }]);
    const files = await readZip(zip);
    expect([...files.keys()]).toEqual(['a.txt', 'dir/b.xml']);
    expect(dec(files.get('dir/b.xml')!)).toBe('<x>é</x>');
  });

  it('refuses what is not a zip', async () => {
    await expect(readZip(enc('Name,Email\nA,a@example.com'))).rejects.toThrow(/not an .xlsx/i);
  });

  it('refuses an entry that claims to unpack to more than the limit, before unpacking it', async () => {
    const zip = writeZip([{ name: 'big.xml', data: enc('x') }]);
    // Patch the central directory's "uncompressed size" to 100 MB.
    const view = new DataView(zip.buffer);
    const cd = view.getUint32(zip.length - 6, true);
    view.setUint32(cd + 24, 100 * 1024 * 1024, true);
    await expect(readZip(zip)).rejects.toThrow(/too large/i);
  });
});
