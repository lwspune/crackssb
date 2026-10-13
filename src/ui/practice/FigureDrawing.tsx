import { figureBounds } from '@/items/oir/figure.ts';
import type { Figure } from '@/items/oir/figure.ts';

/**
 * A redrawn figure (D29) in the text colour, so it follows the theme; lines
 * keep their width at any size. With a label it is an image in its own right;
 * without one it is decoration inside something that already says what it is.
 */
export function FigureDrawing({ figure, label, className = 'mx-auto mt-4 block max-h-72 w-full max-w-md' }: { readonly figure: Figure; readonly label?: string; readonly className?: string }) {
  const b = figureBounds(figure);
  const size = Math.max(b.width, b.height, 1);
  const pad = size * 0.06;
  return (
    <svg
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      viewBox={`${b.x - pad} ${b.y - pad} ${b.width + 2 * pad} ${b.height + 2 * pad}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-foreground ${className}`}
    >
      {figure.lines.map(([x1, y1, x2, y2], i) => (
        <line key={`l${i}`} x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" />
      ))}
      {(figure.circles ?? []).map(([cx, cy, r], i) => (
        <circle key={`c${i}`} cx={cx} cy={cy} r={r} vectorEffect="non-scaling-stroke" />
      ))}
      {(figure.dashed ?? []).map(([x1, y1, x2, y2], i) => (
        <line key={`d${i}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
      ))}
      {(figure.arrows ?? []).map(([x1, y1, x2, y2], i) => {
        // The head: two short strokes back from the tip, a sixth of the shaft long.
        const [dx, dy] = [x2 - x1, y2 - y1];
        const len = Math.hypot(dx, dy) || 1;
        const [ux, uy] = [dx / len, dy / len];
        const h = Math.min(len / 3, size * 0.05);
        const wing = (s: number) => `${x2 - h * ux + s * h * 0.6 * -uy},${y2 - h * uy + s * h * 0.6 * ux}`;
        return (
          <g key={`a${i}`} data-arrow="">
            <line x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" />
            <polyline points={`${wing(1)} ${x2},${y2} ${wing(-1)}`} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
      {(figure.polygons ?? []).map((p, i) => (
        <polygon key={`p${i}`} data-shape="" points={p.points.map(([x, y]) => `${x},${y}`).join(' ')} fill={p.fill ? 'currentColor' : 'none'} vectorEffect="non-scaling-stroke" />
      ))}
      {(figure.labels ?? []).map(([x, y, text], i) => (
        <text key={`t${i}`} x={x} y={y} fontSize={size * 0.16} textAnchor="middle" dominantBaseline="central" fill="currentColor" stroke="none">
          {text}
        </text>
      ))}
    </svg>
  );
}
