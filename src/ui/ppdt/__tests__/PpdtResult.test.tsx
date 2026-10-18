// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { PpdtResult } from '../PpdtResult.tsx';
import { pictureById } from '../../../ppdt/pictures.ts';
import type { PpdtNote } from '../../../ppdt/note.ts';

afterEach(cleanup);

/**
 * A PPDT attempt's result (D33): the picture at last, what is in it, the
 * candidate's own box and story beside it, the quick checks — said to be
 * checks, not a judgement — and a sample story to compare with.
 */
const picture = pictureById('ppdt-04')!;
const note: PpdtNote = { count: 2, people: [{ sex: 'M', age: '35', mood: '-' }, { sex: 'F', age: '28', mood: '+' }], action: 'A meeting at work' };

describe('PpdtResult', () => {
  it('shows the picture now, and what is in it', () => {
    render(<PpdtResult picture={picture} note={note} story="Rohan found an error." paperCode={null} sample="A sample." />);
    expect((screen.getByRole('img', { name: /picture 4/i }) as HTMLImageElement).getAttribute('src')).toBe('/ppdt/ppdt-04.jpg');
    const truth = screen.getByRole('region', { name: /what is in it/i });
    expect(within(truth).getByText(/3 people/)).toBeTruthy();
    expect(within(truth).getByText(picture.action)).toBeTruthy();
  });

  it('lists the quick checks, each passed or not, and says they are not a judgement', () => {
    render(<PpdtResult picture={picture} note={note} story="Rohan found an error." paperCode={null} sample="A sample." />);
    const checks = screen.getByRole('region', { name: /quick checks/i });
    expect(within(checks).getByText('You saw 2. The picture has 3.')).toBeTruthy();
    expect(within(checks).getAllByRole('listitem').some((li) => li.getAttribute('data-ok') === 'false')).toBe(true);
    expect(within(checks).getByText(/not a judgement of your story/i)).toBeTruthy();
  });

  it('shows the candidate’s own box and story, and the sample to compare', () => {
    render(<PpdtResult picture={picture} note={note} story="Rohan found an error." paperCode={null} sample="Rohan, a junior engineer…" />);
    expect(screen.getByText('Rohan found an error.')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: /your character box/i })).getAllByRole('row')).toHaveLength(3);
    expect(within(screen.getByRole('region', { name: /one strong reading/i })).getByText('Rohan, a junior engineer…')).toBeTruthy();
  });

  it('on paper, points to the sheet instead of typed answers', () => {
    render(<PpdtResult picture={picture} note={null} story={null} paperCode="ACD-EFG" sample="A sample." />);
    expect(screen.getByText(/your answers are on your sheet/i)).toBeTruthy();
    expect(screen.getByText('ACD-EFG')).toBeTruthy();
    expect(screen.queryByRole('region', { name: /quick checks/i })).toBeNull();
  });
});
