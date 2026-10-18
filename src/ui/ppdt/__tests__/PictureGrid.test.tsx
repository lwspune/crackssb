// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PictureGrid } from '../PictureGrid.tsx';
import type { PpdtPictureMeta } from '../PpdtRunner.tsx';

afterEach(cleanup);

const pic = (n: number, difficulty: PpdtPictureMeta['difficulty']): PpdtPictureMeta => ({ id: `ppdt-0${n}`, title: `Title ${n}`, image: `/ppdt/ppdt-0${n}.jpg`, difficulty });

describe('PictureGrid', () => {
  const standing = new Map([
    ['ppdt-01', { tries: 2, live: null, last: 's-last' }],
    ['ppdt-02', { tries: 0, live: 's-live', last: null }],
  ]);

  it('shows each picture by number and difficulty only — never the picture or its title, which would spoil it', () => {
    render(<PictureGrid pictures={[pic(1, 'clear'), pic(2, 'hazy'), pic(3, 'ambiguous')]} standing={standing} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText(/Title/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Picture 3, very ambiguous, not tried' }).getAttribute('href')).toBe('/picture/ppdt-03');
  });

  it('says where the viewer stands, and links a tried picture to its last result', () => {
    render(<PictureGrid pictures={[pic(1, 'clear'), pic(2, 'hazy')]} standing={standing} />);
    expect(screen.getByRole('link', { name: 'Picture 1, clear, tried 2 times' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Picture 2, hazy, in progress' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /last result for picture 1/i }).getAttribute('href')).toBe('/results/ppdt/s-last');
  });
});
