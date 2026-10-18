'use client';

import dynamic from 'next/dynamic';

/** PPDT reads its session on first render, so it never renders on the server; the placeholder is the runner's dark ground. */
export const PpdtScreen = dynamic(() => import('./PpdtClient.tsx').then((m) => m.PpdtClient), {
  ssr: false,
  loading: () => <div className="min-h-dvh bg-runner" aria-busy="true" />,
});
