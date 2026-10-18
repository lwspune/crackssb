'use client';

import dynamic from 'next/dynamic';

/** The mock reads its session on first render, so it never renders on the server; the placeholder is the runner's dark ground. */
export const MockScreen = dynamic(() => import('./MockClient.tsx').then((m) => m.MockClient), {
  ssr: false,
  loading: () => <div className="min-h-dvh bg-runner" aria-busy="true" />,
});
