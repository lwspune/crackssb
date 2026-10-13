import type { AnswerPanel } from '@/items/bank.ts';
import { DiceDrawing } from './DiceDrawing.tsx';
import { FigureDrawing } from './FigureDrawing.tsx';

/**
 * A picture answer (D29), drawn inside its option button. Decoration only:
 * the button's own label describes the option in words.
 */
export function AnswerPanelDrawing({ panel }: { readonly panel: AnswerPanel }) {
  if (panel.glyphs) {
    return (
      <span aria-hidden="true" className="flex min-w-0 flex-wrap items-center font-mono text-xl font-semibold">
        {panel.glyphs.map((g, i) => (
          <span
            key={i}
            data-glyph=""
            data-flip={g.flip}
            className="inline-block whitespace-pre"
            style={g.flip ? { transform: g.flip === 'x' ? 'scaleX(-1)' : g.flip === 'y' ? 'scaleY(-1)' : 'scale(-1, -1)' } : undefined}
          >
            {g.ch}
          </span>
        ))}
      </span>
    );
  }
  if (panel.dice) return <DiceDrawing dice={panel.dice} compact />;
  return <FigureDrawing figure={panel.figure!} className="block h-20 w-full max-w-40" />;
}
