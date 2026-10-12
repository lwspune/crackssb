import Link from 'next/link';
import { AREA_HOME, type Area } from '@/lib/auth/routing.ts';

const LABEL: Readonly<Record<Area, string>> = { admin: 'Admin', staff: 'Staff', student: 'Student' };

/**
 * Switch between the areas a role may use (D25). A candidate has one area and
 * sees nothing. Sits on the navy surface: the sidebar and the phone header.
 */
export function AreaSwitcher({ areas, current }: { areas: readonly Area[]; current: Area }) {
  if (areas.length < 2) return null;
  return (
    <nav aria-label="Switch area">
      <ul className="flex gap-1 rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
        {areas.map((area) => {
          const here = area === current;
          return (
            <li key={area} className="flex-1">
              <Link
                href={AREA_HOME[area]}
                aria-current={here ? 'page' : undefined}
                className={`flex min-h-11 items-center justify-center rounded-md px-2.5 text-xs font-semibold tracking-wide transition-colors ${
                  here ? 'bg-navy-accent text-navy' : 'text-navy-muted hover:bg-white/10 hover:text-navy-foreground'
                }`}
              >
                {LABEL[area]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
