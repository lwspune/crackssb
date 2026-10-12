'use client';

import dynamic from 'next/dynamic';

/**
 * The runner reads the session from this device's storage on its first
 * render, so it never renders on the server. The placeholder is the runner's
 * own dark ground, so arriving looks like one surface, not a flash.
 */
export const RunnerScreen = dynamic(() => import('./RunnerClient.tsx').then((m) => m.RunnerClient), {
  ssr: false,
  loading: () => <div className="min-h-dvh bg-runner" aria-busy="true" />,
});
