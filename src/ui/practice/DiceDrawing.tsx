import type { DiceFigure } from '@/items/oir/dice.ts';

/**
 * Dice views and nets (D29), drawn in the text colour so they follow the
 * theme. A face label is text, `pips:N` (dots), `fill` (solid), `cross`
 * (corner to corner) or blank. Labels sit upright at the face's centre;
 * dots and crosses lie on the face.
 */

type Pt = readonly [number, number];
/** A face: corner 0, and the two edges from it. A point (u, v) in the unit square lands at o + u·eu + v·ev. */
interface Face {
  readonly o: Pt;
  readonly eu: Pt;
  readonly ev: Pt;
}

const C = Math.cos(Math.PI / 6);
const at = (f: Face, u: number, v: number): Pt => [f.o[0] + u * f.eu[0] + v * f.ev[0], f.o[1] + u * f.eu[1] + v * f.ev[1]];
const corners = (f: Face) => [at(f, 0, 0), at(f, 1, 0), at(f, 1, 1), at(f, 0, 1)];
const points = (ps: readonly Pt[]) => ps.map((p) => p.map((x) => +x.toFixed(4)).join(',')).join(' ');

/** The cube drawn corner-on: top, front (left) and right faces. */
const CUBE: Readonly<Record<'top' | 'left' | 'right', Face>> = {
  top: { o: [-C, -0.5], eu: [C, -0.5], ev: [C, 0.5] },
  left: { o: [-C, -0.5], eu: [C, 0.5], ev: [0, 1] },
  right: { o: [0, 0], eu: [C, -0.5], ev: [0, 1] },
};

const PIPS: Readonly<Record<number, readonly Pt[]>> = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.27, 0.22], [0.73, 0.22], [0.27, 0.5], [0.73, 0.5], [0.27, 0.78], [0.73, 0.78]],
};

function FaceMarks({ face, label, size }: { readonly face: Face; readonly label: string; readonly size: number }) {
  const outline = <polygon points={points(corners(face))} fill={label === 'fill' ? 'currentColor' : 'none'} data-face={label === 'fill' ? 'fill' : undefined} vectorEffect="non-scaling-stroke" />;
  const pips = /^pips:(\d)$/.exec(label);
  if (pips) {
    return (
      <>
        {outline}
        {(PIPS[Number(pips[1])] ?? []).map(([u, v], i) => {
          const [x, y] = at(face, u, v);
          return <circle key={i} data-pip="" cx={x} cy={y} r={0.075 * size} fill="currentColor" stroke="none" />;
        })}
      </>
    );
  }
  if (label === 'cross') {
    const [a, b, c, d] = corners(face);
    return (
      <>
        {outline}
        <line x1={a[0]} y1={a[1]} x2={c[0]} y2={c[1]} vectorEffect="non-scaling-stroke" />
        <line x1={b[0]} y1={b[1]} x2={d[0]} y2={d[1]} vectorEffect="non-scaling-stroke" />
      </>
    );
  }
  if (label === 'fill' || label === '') return outline;
  const [x, y] = at(face, 0.5, 0.5);
  const fontSize = Math.min(0.36, 1.15 / Math.max(2, [...label].length)) * size;
  return (
    <>
      {outline}
      <text x={x} y={y} fontSize={fontSize} textAnchor="middle" dominantBaseline="central" fill="currentColor" stroke="none">
        {label}
      </text>
    </>
  );
}

const Caption = ({ x, y, text }: { readonly x: number; readonly y: number; readonly text?: string }) =>
  text ? (
    <text x={x} y={y} fontSize={0.3} textAnchor="middle" dominantBaseline="hanging" fill="currentColor" stroke="none">
      {text}
    </text>
  ) : null;

const SVG = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' as const, 'aria-hidden': true };

/** With a label it is an image in its own right; `compact` draws it small and silent inside an answer button. */
export function DiceDrawing({ dice, label, compact = false }: { readonly dice: DiceFigure; readonly label?: string; readonly compact?: boolean }) {
  const viewHeight = compact ? 'h-20' : 'h-28';
  return (
    <div
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      className={`flex flex-wrap items-end justify-center gap-4 text-foreground ${compact ? '' : 'mt-4'}`}
    >
      {(dice.views ?? []).map((v, i) => (
        <svg key={`v${i}`} data-view="" viewBox={`${-C - 0.12} -1.12 ${2 * C + 0.24} ${v.caption ? 2.65 : 2.24}`} className={`${viewHeight} w-auto`} {...SVG}>
          <FaceMarks face={CUBE.top} label={v.top} size={1} />
          <FaceMarks face={CUBE.left} label={v.left} size={1} />
          <FaceMarks face={CUBE.right} label={v.right} size={1} />
          <Caption x={0} y={1.18} text={v.caption} />
        </svg>
      ))}
      {(dice.nets ?? []).map((n, i) => {
        const [r0, c0] = [Math.min(...n.cells.map((x) => x.r)), Math.min(...n.cells.map((x) => x.c))];
        const [rows, cols] = [Math.max(...n.cells.map((x) => x.r)) - r0 + 1, Math.max(...n.cells.map((x) => x.c)) - c0 + 1];
        return (
          <svg key={`n${i}`} viewBox={`-0.1 -0.1 ${cols + 0.2} ${rows + (n.caption ? 0.6 : 0.2)}`} className="w-auto" style={{ height: `${Math.min(14, 2.6 * rows + (n.caption ? 0.6 : 0))}rem` }} {...SVG}>
            {n.cells.map((cell) => (
              <g key={`${cell.r},${cell.c}`} data-net-cell="">
                <FaceMarks face={{ o: [cell.c - c0, cell.r - r0], eu: [1, 0], ev: [0, 1] }} label={cell.face} size={1} />
              </g>
            ))}
            <Caption x={cols / 2} y={rows + 0.12} text={n.caption} />
          </svg>
        );
      })}
    </div>
  );
}
