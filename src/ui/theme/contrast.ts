/**
 * Colour-token arithmetic for the theme contrast gate
 * (src/ui/__tests__/theme-contrast.test.ts). Ported from Question_Bank, whose
 * palette this product shares. Pure: reads the `--name: H S% L%` tokens out of
 * globals.css text and computes WCAG 2.x contrast ratios, so the AA rule is
 * checked against the CSS that actually ships, not a copy of it.
 */

export type Rgb = [number, number, number];

/** The `--token: H S% L%` declarations inside the first block for `selector`. */
export function readTokens(css: string, selector: string): Record<string, string> {
  const at = css.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`no "${selector} {" block in the stylesheet`);
  const body = css.slice(at, css.indexOf("}", at));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

/** "222 47% 11%" → [r, g, b] in 0..255. */
export function hslToRgb(value: string): Rgb {
  const m = value.match(/^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) throw new Error(`not an "H S% L%" token: ${value}`);
  const h = (((Number(m[1]) % 360) + 360) % 360) / 360;
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const ch = (t: number) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [ch(h + 1 / 3) * 255, ch(h) * 255, ch(h - 1 / 3) * 255];
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

export function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Largest per-channel distance between two colours, 0..255. */
export function channelDistance(a: Rgb, b: Rgb): number {
  return Math.max(...a.map((v, i) => Math.abs(v - b[i])));
}
