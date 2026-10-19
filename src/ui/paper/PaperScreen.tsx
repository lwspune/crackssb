'use client';

import dynamic from 'next/dynamic';

/** SRT and SDT read their session on first render, so they never render on the server; the placeholder is the runner's dark ground. */
export const PaperScreen = dynamic(() => import('./PaperClient.tsx').then((m) => m.PaperClient), {
  ssr: false,
  loading: () => <div className="min-h-dvh bg-runner" aria-busy="true" />,
});
