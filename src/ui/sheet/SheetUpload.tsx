'use client';

import { useState } from 'react';

/**
 * Photographing a paper answer sheet (D22, D34). The camera opens; the photo
 * is shrunk on the phone (a sheet reads well at 1600 px and uploads fast on
 * mobile data); the server names the one path it may go to (`request`, which
 * asks the database, 0013); it goes straight to private storage (`upload`,
 * a signed link); the page refreshes to show what arrived. Up to four pages,
 * each with a retake.
 */

export const MAX_PAGES = 4;
const LONGEST = 1600;

/** The size to draw a photo at: its longest side at most `max`, shape kept. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** The browser's own decoder and canvas: no package. */
export async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, LONGEST);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('could not encode'))), 'image/jpeg', 0.82));
}

export type UploadRequest = { readonly kind: 'ok'; readonly path: string; readonly token: string } | { readonly kind: 'forbidden' } | { readonly kind: 'failed' };

interface Props {
  readonly sessionId: string;
  readonly photos: readonly { readonly page: number; readonly url: string }[];
  readonly request: (sessionId: string, page: number) => Promise<UploadRequest>;
  readonly upload: (path: string, token: string, photo: Blob) => Promise<{ error: { message: string } | null }>;
  readonly shrink?: (file: File) => Promise<Blob>;
  /** After a page arrives: the app refreshes to show it. */
  readonly onDone: () => void;
}

const BUTTON =
  'inline-flex min-h-11 cursor-pointer items-center rounded-lg px-4 text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring';

export function SheetUpload({ sessionId, photos, request, upload, shrink = shrinkPhoto, onDone }: Props) {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const next = photos.length < MAX_PAGES ? Math.max(0, ...photos.map((p) => p.page)) + 1 : null;

  const send = async (page: number, file: File | undefined) => {
    if (!file) return;
    setBusy(page);
    setError(null);
    try {
      const small = await shrink(file);
      const r = await request(sessionId, page);
      if (r.kind !== 'ok') {
        setError(r.kind === 'forbidden' ? 'You cannot add a photo to this attempt.' : 'Could not start the upload. Try again.');
        return;
      }
      const { error: upErr } = await upload(r.path, r.token, small);
      if (upErr) {
        setError('The photo did not upload. Check your connection and try again.');
        return;
      }
      onDone();
    } catch {
      setError('That photo could not be read. Try another.');
    } finally {
      setBusy(null);
    }
  };

  const picker = (page: number, label: string, primary: boolean) => (
    <label className={`${BUTTON} ${primary ? 'bg-brand text-brand-foreground hover:bg-brand/90' : 'border hover:bg-secondary'}`}>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        aria-label={`${label === 'Retake' ? 'Retake' : 'Photograph'} page ${page}`}
        className="sr-only"
        disabled={busy !== null}
        onChange={(e) => void send(page, e.target.files?.[0])}
      />
      {busy === page ? 'Uploading…' : label}
    </label>
  );

  return (
    <section aria-labelledby="sheet-h" className="rounded-xl border bg-card p-5 shadow-card">
      <h2 id="sheet-h" className="text-lg font-bold">Your sheet</h2>
      <p className="mt-1 text-sm text-muted-foreground">Photograph it flat, in good light, the whole page in the frame.</p>
      {photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p) => (
            <li key={p.page} className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Your sheet, page ${p.page}`} className="aspect-[3/4] w-full rounded-lg border object-cover" />
              {picker(p.page, 'Retake', false)}
            </li>
          ))}
        </ul>
      )}
      {next !== null && <div className="mt-4">{picker(next, next === 1 ? 'Photograph your sheet' : `Add page ${next}`, next === 1)}</div>}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
