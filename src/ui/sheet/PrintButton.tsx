'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand/90"
    >
      Print
    </button>
  );
}
