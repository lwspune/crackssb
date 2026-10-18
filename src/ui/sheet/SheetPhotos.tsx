/** A paper attempt's sheet photos, read-only — for staff looking at a candidate's attempt (D34). */
export function SheetPhotos({ photos }: { photos: readonly { page: number; url: string }[] }) {
  return (
    <section aria-labelledby="photos-h" className="rounded-xl border bg-card p-5 shadow-card">
      <h2 id="photos-h" className="text-lg font-bold">The sheet</h2>
      {photos.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No photo uploaded yet.</p>
      ) : (
        // Handwriting to be read: one page fills the card; each opens full size.
        <ul className={`mt-4 grid grid-cols-1 gap-3 ${photos.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {photos.map((p) => (
            <li key={p.page}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Page ${p.page}, full size (opens in a new tab)`}
                className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`The sheet, page ${p.page}`} className="w-full rounded-lg border" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
