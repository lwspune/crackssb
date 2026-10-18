'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSupabaseBrowser } from '../../lib/supabase/browser.ts';
import { createServerStore } from '../runner/server-store.ts';
import type { ServerRecord } from '../runner/server-store.ts';
import { supabaseSessionApi } from '../runner/supabase-api.ts';
import { PpdtRunner } from './PpdtRunner.tsx';
import type { PpdtPictureMeta } from './PpdtRunner.tsx';

interface Props {
  picture: PpdtPictureMeta;
  /** The candidate's live PPDT attempt, if any — this picture's or another's. */
  initial: ServerRecord | null;
  serverNowMs: number;
}

/** Binds a PPDT attempt to the server: its clock, its record, its windows (0012). Over, it goes to the result. */
export function PpdtClient({ picture, initial, serverNowMs }: Props) {
  const router = useRouter();
  const [store] = useState(() => createServerStore(supabaseSessionApi(createSupabaseBrowser()), { initial, serverNowMs }));
  return <PpdtRunner picture={picture} store={store} onDone={(record) => router.replace(`/results/ppdt/${(record as ServerRecord).id}`)} />;
}
