import type { SVGProps } from 'react';

/** Inline stroke icons — five tabs and a mark do not justify an icon package. Decorative: pair with visible text. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></Icon>
);
export const PractiseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="12" cy="12" r="8" /><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /></Icon>
);
export const ResultsIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></Icon>
);
export const OlqIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></Icon>
);
export const ProfileIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></Icon>
);
export const PeopleIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.6 3.5 5.2" /></Icon>
);
export const BatchIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" /></Icon>
);
export const ReviewIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 12h5" /></Icon>
);
export const AcademyIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M3 9l9-5 9 5-9 5z" /><path d="M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5M21 9v6" /></Icon>
);
export const ArrowIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
);
export const SunIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>
);
export const MoonIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></Icon>
);

/** The mark: a range reticle. Deliberately no crest, insignia or emblem — we are not affiliated with any service. */
export const Mark = (p: SVGProps<SVGSVGElement>) => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...p}>
    <circle cx="14" cy="14" r="9" />
    <path d="M14 1.5v7M14 19.5v7M1.5 14h7M19.5 14h7" />
    <circle cx="14" cy="14" r="1.8" fill="currentColor" stroke="none" />
  </svg>
);
