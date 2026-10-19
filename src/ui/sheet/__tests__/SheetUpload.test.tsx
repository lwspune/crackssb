// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { fitWithin, SheetUpload } from '../SheetUpload.tsx';

afterEach(cleanup);

/**
 * Photographing a paper answer sheet (D22, D34): the camera opens, the photo
 * is shrunk on the phone, the server names where it may go, it goes straight
 * to storage, and the page shows what has arrived — with a retake.
 */
describe('fitWithin', () => {
  it('shrinks the longest side to the limit, keeping the shape', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('leaves a small photo as it is', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

const photo = () => new File([new Uint8Array([0xff, 0xd8, 0xff])], 'sheet.jpg', { type: 'image/jpeg' });

describe('SheetUpload', () => {
  const props = (over: Partial<Parameters<typeof SheetUpload>[0]> = {}) => ({
    sessionId: 's1',
    photos: [],
    request: vi.fn(async () => ({ kind: 'ok' as const, path: 'u/s1/page-1.jpg', token: 't' })),
    upload: vi.fn(async () => ({ error: null })),
    shrink: vi.fn(async (f: File) => f as Blob),
    onDone: vi.fn(),
    ...over,
  });

  it('stops at four pages, or at eight for a TAT sheet (D36)', () => {
    const four = Array.from({ length: 4 }, (_, i) => ({ page: i + 1, url: `/p${i + 1}.jpg` }));
    const { unmount } = render(<SheetUpload {...props({ photos: four })} />);
    expect(screen.queryByLabelText(/photograph page 5/i)).toBeNull();
    unmount();
    render(<SheetUpload {...props({ photos: four, maxPages: 8 })} />);
    expect(screen.getByLabelText(/photograph page 5/i)).toBeTruthy();
  });

  it('opens the camera for page 1', () => {
    render(<SheetUpload {...props()} />);
    const input = screen.getByLabelText(/photograph page 1/i) as HTMLInputElement;
    expect(input.accept).toBe('image/*');
    expect(input.getAttribute('capture')).toBe('environment');
  });

  it('shrinks the photo, asks where it may go, sends it there, and refreshes', async () => {
    const p = props();
    render(<SheetUpload {...p} />);
    fireEvent.change(screen.getByLabelText(/photograph page 1/i), { target: { files: [photo()] } });
    await waitFor(() => expect(p.onDone).toHaveBeenCalled());
    expect(p.shrink).toHaveBeenCalled();
    expect(p.request).toHaveBeenCalledWith('s1', 1);
    expect(p.upload).toHaveBeenCalledWith('u/s1/page-1.jpg', 't', expect.anything());
  });

  it('shows the pages that have arrived, each with a retake, and offers the next page up to four', () => {
    render(<SheetUpload {...props({ photos: [{ page: 1, url: 'https://x/1' }, { page: 2, url: 'https://x/2' }] })} />);
    expect(screen.getAllByRole('img', { name: /your sheet, page/i })).toHaveLength(2);
    expect(screen.getByLabelText(/retake page 1/i)).toBeTruthy();
    expect(screen.getByLabelText(/photograph page 3/i)).toBeTruthy();
  });

  it('stops offering pages at four', () => {
    render(<SheetUpload {...props({ photos: [1, 2, 3, 4].map((page) => ({ page, url: `https://x/${page}` })) })} />);
    expect(screen.queryByLabelText(/photograph page 5/i)).toBeNull();
  });

  it('says so when the server refuses, or the upload fails', async () => {
    const refused = props({ request: vi.fn(async () => ({ kind: 'forbidden' as const })) });
    render(<SheetUpload {...refused} />);
    fireEvent.change(screen.getByLabelText(/photograph page 1/i), { target: { files: [photo()] } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/cannot add a photo/i));
    cleanup();
    const failed = props({ upload: vi.fn(async () => ({ error: { message: 'network' } })) });
    render(<SheetUpload {...failed} />);
    fireEvent.change(screen.getByLabelText(/photograph page 1/i), { target: { files: [photo()] } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/did not upload/i));
    expect(failed.onDone).not.toHaveBeenCalled();
  });
});
