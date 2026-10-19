'use client';

import dynamic from 'next/dynamic';

/** TAT reads its session on first render, so it never renders on the server; the placeholder is the runner's dark ground. */
export const TatScreen = dynamic(() => import('./TatClient.tsx').then((m) => m.TatClient), {
  ssr: false,
  loading: () => <div className="min-h-dvh bg-runner" aria-busy="true" />,
});
