'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSupabaseBrowser } from '../../lib/supabase/browser.ts';
import type { PracticeItem } from '../practice/PracticeRunner.tsx';
import { createServerStore } from '../runner/server-store.ts';
import type { ServerRecord } from '../runner/server-store.ts';
import { supabaseSessionApi } from '../runner/supabase-api.ts';
import { BookletRunner } from './BookletRunner.tsx';
import type { MockMeta } from './BookletRunner.tsx';

interface Props {
  mock: MockMeta;
  items: readonly PracticeItem[];
  /** The candidate's live OIR attempt, if any — this mock's or another's. */
  initial: ServerRecord | null;
  serverNowMs: number;
}

/** Binds a mock to the server: its clock, its record, its rules (0009). Over, it goes to the result. */
export function MockClient({ mock, items, initial, serverNowMs }: Props) {
  const router = useRouter();
  const [store] = useState(() => createServerStore(supabaseSessionApi(createSupabaseBrowser()), { initial, serverNowMs }));
  return <BookletRunner mock={mock} items={items} store={store} onDone={(record) => router.replace(`/results/mock/${(record as ServerRecord).id}`)} />;
}
