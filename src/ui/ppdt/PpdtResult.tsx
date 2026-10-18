import Link from 'next/link';
import { checkAttempt } from '../../ppdt/feedback.ts';
import type { PpdtNote } from '../../ppdt/note.ts';
import type { Mood, PpdtPicture } from '../../ppdt/pictures.ts';
import { ArrowIcon } from '../icons.tsx';

/**
 * A PPDT attempt's result (D33): the picture at last; what is in it (our
 * ground truth); the candidate's own box and story; the quick checks, which
 * count and compare and say they are not a judgement of the story; and one
 * strong reading to compare with. On paper the answers are on the sheet, so
 * the page gives everything to check them against. Server-renderable.
 */

interface Props {
  readonly picture: PpdtPicture;
  /** Null on paper. */
  readonly note: PpdtNote | null;
  readonly story: string | null;
  readonly paperCode: string | null;
  readonly sample: string | null;
}

const MOOD: Readonly<Record<Mood, string>> = { positive: 'positive', neutral: 'neutral', negative: 'low' };
const MARK: Readonly<Record<string, string>> = { '+': '+', '0': '0', '-': '−', '': '—' };

export function PpdtResult({ picture, note, story, paperCode, sample }: Props) {
  const n = Number(picture.id.slice(-2));
  const paper = paperCode !== null;
  const checks = paper || note === null ? [] : checkAttempt(picture, note, story ?? '');
  const people = picture.people.min === picture.people.max ? `${picture.people.typical} people` : `about ${picture.people.typical} people (${picture.people.min}–${picture.people.max})`;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/ppdt/${picture.id}.jpg`} alt={`Picture ${n}: ${picture.action}`} className="w-full rounded-xl border shadow-card" />
        </figure>
        <section aria-labelledby="truth-h" className="rounded-xl border bg-card p-5 shadow-card">
          <h2 id="truth-h" className="text-lg font-bold">What is in it</h2>
          <p className="mt-2 font-semibold">{people}</p>
          {picture.characters.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {picture.characters.map((c, i) => (
                <li key={i} className="tabular-nums">
                  {c.sex === 'M' ? 'Man' : c.sex === 'F' ? 'Woman' : 'Person'}, {c.age} · {MOOD[c.mood]}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm">{picture.action}</p>
          <p className="mt-3 text-xs text-muted-foreground">A fair reading can see it as {picture.moods.map((m) => MOOD[m]).join(' or ')}.</p>
        </section>
      </div>

      {paper ? (
        <section className="rounded-xl border border-dashed p-5">
          <p className="font-semibold">Your answers are on your sheet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Session code <span className="font-mono font-semibold text-foreground">{paperCode}</span>. Check your count, moods and story against the picture and the reading below.
          </p>
        </section>
      ) : (
        <>
          <section aria-labelledby="checks-h" className="rounded-xl border bg-card p-5 shadow-card">
            <h2 id="checks-h" className="text-lg font-bold">Quick checks</h2>
            <p className="mt-1 text-sm text-muted-foreground">Counts and words, not a judgement of your story.</p>
            <ul className="mt-4 space-y-2">
              {checks.map((c) => (
                <li key={c.kind} data-ok={String(c.ok)} className="flex items-start gap-3">
                  <span aria-hidden="true" className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${c.ok ? 'bg-correct/15 text-correct' : 'bg-runner-warn/20 text-foreground'}`}>
                    {c.ok ? '✓' : '!'}
                  </span>
                  <span className="sr-only">{c.ok ? 'Done: ' : 'To work on: '}</span>
                  <span>{c.line}</span>
                </li>
              ))}
            </ul>
          </section>

          {note && (
            <section aria-labelledby="box-h" className="rounded-xl border bg-card p-5 shadow-card">
              <h2 id="box-h" className="text-lg font-bold">Your character box</h2>
              <p className="mt-1 text-sm">Characters seen: <span className="font-semibold tabular-nums">{note.count ?? '—'}</span></p>
              {note.people.length > 0 && (
                <table className="mt-3 text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-4 text-left font-semibold">#</th>
                      <th className="py-1 pr-4 text-left font-semibold">Sex</th>
                      <th className="py-1 pr-4 text-left font-semibold">Age</th>
                      <th className="py-1 text-left font-semibold">Mood</th>
                    </tr>
                  </thead>
                  <tbody>
                    {note.people.map((p, i) => (
                      <tr key={i} className="tabular-nums">
                        <td className="py-1 pr-4">{i + 1}</td>
                        <td className="py-1 pr-4">{p.sex || '—'}</td>
                        <td className="py-1 pr-4">{p.age || '—'}</td>
                        <td className="py-1">{MARK[p.mood]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-3 text-sm">Action: {note.action || <span className="text-muted-foreground">—</span>}</p>
            </section>
          )}

          <section aria-labelledby="story-h" className="rounded-xl border bg-card p-5 shadow-card">
            <h2 id="story-h" className="text-lg font-bold">Your story</h2>
            {story ? <p className="mt-3 whitespace-pre-line font-serif text-lg leading-relaxed">{story}</p> : <p className="mt-3 text-sm text-muted-foreground">No story written.</p>}
          </section>
        </>
      )}

      {sample && (
        <section aria-labelledby="sample-h" className="rounded-xl border border-brand/30 bg-accent/40 p-5">
          <h2 id="sample-h" className="text-lg font-bold">One strong reading</h2>
          <p className="mt-1 text-sm text-muted-foreground">One way among many: a hero your age, a real problem, action, an outcome.</p>
          <p className="mt-3 font-serif text-lg leading-relaxed">{sample}</p>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href={`/picture/${picture.id}`} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          Try this picture again <ArrowIcon width={16} height={16} />
        </Link>
        <Link href="/practise/ppdt" className="inline-flex min-h-12 items-center rounded-lg border px-5 text-sm font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring">
          All pictures
        </Link>
      </div>
    </div>
  );
}
