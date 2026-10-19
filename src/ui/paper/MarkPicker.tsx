/**
 * One mark 1 to 5, as five buttons — and, where a part may not have been
 * written, a sixth. A fieldset named by its legend, so a screen reader hears
 * "Practical, group" and "4 of 5". Used by the SRT and SDT forms (D39, D40).
 */
const CHIP =
  'grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-lg border px-2 text-sm font-semibold tabular-nums hover:bg-secondary has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-brand-foreground has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring';

interface Props {
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  readonly value: number | null | undefined;
  readonly onPick: (n: number | null) => void;
  /** Offer "Not written": a null that is chosen, not left blank. */
  readonly notWritten?: { readonly chosen: boolean };
}

export function MarkPicker({ name, label, hint, value, onPick, notWritten }: Props) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <legend className="sr-only">{label}</legend>
      <div>
        <p aria-hidden="true" className="font-semibold">{label}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={CHIP}>
            <input type="radio" name={name} checked={value === n} onChange={() => onPick(n)} aria-label={`${n} of 5`} className="sr-only" />
            {n}
          </label>
        ))}
        {notWritten && (
          <label className={CHIP}>
            <input type="radio" name={name} checked={value === null && notWritten.chosen} onChange={() => onPick(null)} className="sr-only" />
            Not written
          </label>
        )}
      </div>
    </fieldset>
  );
}
