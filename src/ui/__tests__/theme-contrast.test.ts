import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readTokens, hslToRgb, hexToRgb, contrastRatio, channelDistance, luminance } from '../theme/contrast.ts';

/**
 * The colour tokens in globals.css, checked as they ship.
 *
 * The palette is Question_Bank's (PYQVault): navy text, royal-blue brand, a
 * tinted page under white cards, a navy dark mode. Added here: the runner's
 * own tokens, because the runner is the one surface that is dark in BOTH
 * modes — UI.md §4, "the runner has no shell", and the contrast is the design.
 */
const css = readFileSync(join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
const modes = { light: readTokens(css, ':root'), dark: readTokens(css, '.dark') } as const;
type Mode = keyof typeof modes;
const rgb = (mode: Mode, token: string) => hslToRgb(modes[mode][token]);

/** Every text/background pair the UI paints. AA for body text is 4.5:1. */
const TEXT_PAIRS: [text: string, bg: string][] = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['card-foreground', 'card'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'muted'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['brand-foreground', 'brand'],
  ['brand-accent', 'background'],
  ['brand-accent', 'card'],
  ['brand-accent', 'accent'],
  ['runner-foreground', 'runner-background'],
  ['runner-muted', 'runner-background'],
  ['runner-warn', 'runner-background'],
  // The navy surface: sidebar, mobile header, Home's hero panel.
  ['navy-foreground', 'navy'],
  ['navy-muted', 'navy'],
  ['navy-accent', 'navy'],
  ['brand-foreground', 'brand'],
];

/** Focus rings and the runner's clock bar are non-text: WCAG 1.4.11 asks 3:1. */
const NON_TEXT_PAIRS: [fg: string, bg: string][] = [
  ['ring', 'background'],
  ['ring', 'card'],
  ['runner-ring', 'runner-background'],
  ['runner-foreground', 'runner-track'],
  ['runner-warn', 'runner-track'],
  // Royal blue on navy is ~2.2:1, so the primary button on navy is white, not brand.
  ['navy-ring', 'navy'],
];

describe('theme tokens clear WCAG AA in both modes', () => {
  for (const mode of ['light', 'dark'] as const) {
    for (const [text, bg] of TEXT_PAIRS) {
      it(`${mode}: --${text} on --${bg} ≥ 4.5`, () => {
        expect(contrastRatio(rgb(mode, text), rgb(mode, bg))).toBeGreaterThanOrEqual(4.5);
      });
    }
    for (const [fg, bg] of NON_TEXT_PAIRS) {
      it(`${mode}: --${fg} against --${bg} ≥ 3`, () => {
        expect(contrastRatio(rgb(mode, fg), rgb(mode, bg))).toBeGreaterThanOrEqual(3);
      });
    }
  }
});

describe('theme tokens follow PYQVault', () => {
  it("the light-mode brand fill is PYQVault's royal blue (#1D4ED8)", () => {
    expect(channelDistance(rgb('light', 'brand'), hexToRgb('#1D4ED8'))).toBeLessThanOrEqual(3);
  });

  it("light-mode text is PYQVault's navy (#0F1D4A), not near-black", () => {
    expect(channelDistance(rgb('light', 'foreground'), hexToRgb('#0F1D4A'))).toBeLessThanOrEqual(3);
  });

  it('the page is tinted so white cards stand off it', () => {
    expect(modes.light.background).not.toBe(modes.light.card);
    expect(channelDistance(rgb('light', 'card'), [255, 255, 255])).toBe(0);
  });

  it('dark mode sits on navy, not slate black', () => {
    const [r, g, b] = rgb('dark', 'background');
    expect(b).toBeGreaterThan(r + 25);
    expect(b).toBeGreaterThan(g + 15);
  });
});

describe('the navy surface (D20)', () => {
  it("is PYQVault's logo navy in light mode", () => {
    expect(channelDistance(rgb('light', 'navy'), hexToRgb('#0F1D4A'))).toBeLessThanOrEqual(3);
  });

  it('sits darker than the page in dark mode, so the sidebar still reads as a panel', () => {
    expect(luminance(rgb('dark', 'navy'))).toBeLessThan(luminance(rgb('dark', 'background')));
  });
});

describe('the runner is a different surface from the app (UI.md §4)', () => {
  for (const mode of ['light', 'dark'] as const) {
    it(`${mode}: the runner ground is darker than the app page`, () => {
      expect(luminance(rgb(mode, 'runner-background'))).toBeLessThan(luminance(rgb(mode, 'background')));
      expect(luminance(rgb(mode, 'runner-background'))).toBeLessThan(0.02);
    });
  }
});
