import { ImageResponse } from 'next/og';
import { BRAND } from '@/ui/brand.ts';

/** The card WhatsApp, X and search show for a shared link. Built once at build time; the navy surface and Mark from the app (D20). */

export const alt = `${BRAND.name} — SSB interview preparation`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const NAVY = '#0F1D4A';
const FOREGROUND = '#E6ECF8';
const MUTED = '#A3B0CF';
const ACCENT = '#7AB0FF';
const TESTS = ['OIR', 'PPDT', 'TAT', 'WAT', 'SRT', 'SDT'];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 80, background: NAVY, color: FOREGROUND }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 28 28" fill="none" stroke={ACCENT} strokeWidth="1.8">
            <circle cx="14" cy="14" r="9" />
            <path d="M14 1.5v7M14 19.5v7M1.5 14h7M19.5 14h7" />
            <circle cx="14" cy="14" r="1.8" fill={ACCENT} stroke="none" />
          </svg>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700 }}>
            <span>{BRAND.lead}</span>
            <span style={{ color: ACCENT }}>{BRAND.accent}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>Five days.</div>
          <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>One clock.</div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: 36, color: MUTED }}>SSB interview preparation</div>
          <div style={{ display: 'flex', gap: 28, marginTop: 12, fontSize: 36, color: ACCENT }}>
            {TESTS.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
