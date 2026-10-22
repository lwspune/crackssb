import { ImageResponse } from 'next/og';

/** The home-screen and logo icon: the Mark on navy (D20). Built once at build time. */

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F1D4A' }}>
        <svg width="120" height="120" viewBox="0 0 28 28" fill="none" stroke="#7AB0FF" strokeWidth="1.8">
          <circle cx="14" cy="14" r="9" />
          <path d="M14 1.5v7M14 19.5v7M1.5 14h7M19.5 14h7" />
          <circle cx="14" cy="14" r="1.8" fill="#7AB0FF" stroke="none" />
        </svg>
      </div>
    ),
    size,
  );
}
