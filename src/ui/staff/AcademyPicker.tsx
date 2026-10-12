import { pickAcademy } from '@/app/actions/acting.ts';
import type { Academy } from '@/lib/auth/acting-server.ts';

/**
 * The superadmin's academy for the staff area (D25). A plain form: it works
 * before any JavaScript loads, and the server checks the pick.
 */
export function AcademyPicker({ academies, acting }: { academies: readonly Academy[]; acting: Academy | null }) {
  return (
    <form action={pickAcademy} className="flex flex-wrap items-end gap-2 border-b bg-card/70 px-4 py-3 sm:px-6 md:px-10">
      <div className="min-w-0 flex-1 sm:flex-none">
        <label htmlFor="acting-org" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Academy
        </label>
        <select
          id="acting-org"
          name="org"
          defaultValue={acting?.id ?? ''}
          required
          className="mt-1 block min-h-11 w-full rounded-lg border bg-card px-3 text-base shadow-card sm:w-72"
        >
          <option value="" disabled>
            Pick an academy
          </option>
          {academies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand/90">
        Open
      </button>
    </form>
  );
}
