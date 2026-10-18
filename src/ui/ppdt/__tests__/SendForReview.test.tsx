// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { SendForReview } from '../SendForReview.tsx';

afterEach(cleanup);

/**
 * Sending a PPDT attempt for review (D34): once, after a confirm, because
 * nothing can change after. It needs something to review.
 */
describe('SendForReview', () => {
  const props = (over: Partial<Parameters<typeof SendForReview>[0]> = {}) => ({
    ready: true,
    paper: false,
    hasNarration: true,
    submittedAt: null,
    submit: vi.fn(async () => ({ kind: 'ok' as const, at: '2026-10-18T10:00:00Z' })),
    onDone: vi.fn(),
    ...over,
  });

  it('asks once more, then sends', async () => {
    const p = props();
    render(<SendForReview {...p} />);
    fireEvent.click(screen.getByRole('button', { name: /send for review/i }));
    expect(p.submit).not.toHaveBeenCalled();
    expect(screen.getByText(/nothing can change/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await waitFor(() => expect(p.onDone).toHaveBeenCalled());
  });

  it('can be put off at the confirm', () => {
    const p = props();
    render(<SendForReview {...p} />);
    fireEvent.click(screen.getByRole('button', { name: /send for review/i }));
    fireEvent.click(screen.getByRole('button', { name: /not yet/i }));
    expect(screen.getByRole('button', { name: /send for review/i })).toBeTruthy();
  });

  it('waits for the sheet on paper, and says when there is no narration', () => {
    render(<SendForReview {...props({ ready: false, paper: true, hasNarration: false })} />);
    expect((screen.getByRole('button', { name: /send for review/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/photograph your sheet first/i)).toBeTruthy();
    expect(screen.getByText(/no narration/i)).toBeTruthy();
  });

  it('shows when it was sent, and offers nothing more', () => {
    render(<SendForReview {...props({ submittedAt: '2026-10-18T10:00:00Z' })} />);
    expect(screen.getByText(/sent for review/i).textContent).toMatch(/18 Oct/);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says why the server refused', async () => {
    const p = props({ submit: vi.fn(async () => ({ kind: 'refused' as const, reason: 'no_recording' })) });
    render(<SendForReview {...p} />);
    fireEvent.click(screen.getByRole('button', { name: /send for review/i }));
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/recording did not save/i));
    expect(p.onDone).not.toHaveBeenCalled();
  });
});
