// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { NarrationRecorder, pickMime, LIMIT_MS } from '../NarrationRecorder.tsx';
import type { Mic } from '../NarrationRecorder.tsx';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/**
 * Narrating the story aloud (D34): one minute, as to the group at the SSB.
 * Each take is saved as soon as it stops; record again until the attempt is
 * sent for review, then it is fixed.
 */
describe('pickMime', () => {
  it('prefers Opus in WebM, falls back to MP4 (Safari) and Ogg, and names the plain type stored', () => {
    expect(pickMime(() => true)).toEqual({ recorder: 'audio/webm;codecs=opus', stored: 'audio/webm' });
    expect(pickMime((t) => t === 'audio/mp4')).toEqual({ recorder: 'audio/mp4', stored: 'audio/mp4' });
    expect(pickMime((t) => t.startsWith('audio/ogg'))).toEqual({ recorder: 'audio/ogg;codecs=opus', stored: 'audio/ogg' });
    expect(pickMime(() => false)).toBeNull();
  });
});

const fakeMic = (durationMs = 42_000) => {
  const mic = {
    start: vi.fn(),
    stop: vi.fn(async () => ({ blob: new Blob(['a'], { type: 'audio/webm' }), durationMs, mime: 'audio/webm' })),
    cancel: vi.fn(),
  } satisfies Mic;
  return mic;
};

describe('NarrationRecorder', () => {
  const props = (over: Partial<Parameters<typeof NarrationRecorder>[0]> = {}) => {
    const mic = fakeMic();
    return {
      mic,
      p: {
        sessionId: 's1',
        narration: null,
        locked: false,
        request: vi.fn(async () => ({ kind: 'ok' as const, path: 'u/s1/narration-abc', token: 't' })),
        upload: vi.fn(async () => ({ error: null })),
        openMic: vi.fn(async () => mic),
        onDone: vi.fn(),
        ...over,
      },
    };
  };

  it('records, and saves the take the moment it stops', async () => {
    const { p, mic } = props();
    render(<NarrationRecorder {...p} />);
    fireEvent.click(screen.getByRole('button', { name: /record/i }));
    await waitFor(() => expect(mic.start).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    await waitFor(() => expect(p.onDone).toHaveBeenCalled());
    expect(p.request).toHaveBeenCalledWith('s1', 'audio/webm', 42_000);
    expect(p.upload).toHaveBeenCalledWith('u/s1/narration-abc', 't', expect.any(Blob), 'audio/webm');
  });

  it('stops itself at the minute', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { p, mic } = props();
    render(<NarrationRecorder {...p} />);
    fireEvent.click(screen.getByRole('button', { name: /record/i }));
    await waitFor(() => expect(mic.start).toHaveBeenCalled());
    await act(async () => {
      vi.advanceTimersByTime(LIMIT_MS + 500);
    });
    await waitFor(() => expect(mic.stop).toHaveBeenCalled());
  });

  it('plays the saved take, with its length, and offers another', () => {
    const { p } = props({ narration: { url: 'https://x/a', durationMs: 58_000 } });
    const { container } = render(<NarrationRecorder {...p} />);
    expect(container.querySelector('audio')?.getAttribute('src')).toBe('https://x/a');
    expect(screen.getByText('0:58')).toBeTruthy();
    expect(screen.getByRole('button', { name: /record again/i })).toBeTruthy();
  });

  it('once sent for review, only plays', () => {
    const { p } = props({ narration: { url: 'https://x/a', durationMs: 58_000 }, locked: true });
    const { container } = render(<NarrationRecorder {...p} />);
    expect(container.querySelector('audio')).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says what went wrong: no microphone, a refusal, a failed save, a take under a second', async () => {
    const denied = props({ openMic: vi.fn(async () => Promise.reject(Object.assign(new Error('x'), { reason: 'denied' }))) });
    render(<NarrationRecorder {...denied.p} />);
    fireEvent.click(screen.getByRole('button', { name: /record/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/allow the microphone/i));
    cleanup();

    const unsupported = props({ openMic: vi.fn(async () => Promise.reject(Object.assign(new Error('x'), { reason: 'unsupported' }))) });
    render(<NarrationRecorder {...unsupported.p} />);
    fireEvent.click(screen.getByRole('button', { name: /record/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/cannot record/i));
    cleanup();

    const failed = props({ upload: vi.fn(async () => ({ error: { message: 'network' } })) });
    render(<NarrationRecorder {...failed.p} />);
    fireEvent.click(screen.getByRole('button', { name: /record/i }));
    await waitFor(() => expect(failed.mic.start).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/did not save/i));
    expect(failed.p.onDone).not.toHaveBeenCalled();
    cleanup();

    const short = props();
    short.mic.stop.mockResolvedValueOnce({ blob: new Blob(['a']), durationMs: 400, mime: 'audio/webm' });
    render(<NarrationRecorder {...short.p} />);
    fireEvent.click(screen.getByRole('button', { name: /record/i }));
    await waitFor(() => expect(short.mic.start).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/too short/i));
    expect(short.p.request).not.toHaveBeenCalled();
  });

  it('lets the microphone go if the page is left mid-take', async () => {
    const { p, mic } = props();
    const { unmount } = render(<NarrationRecorder {...p} />);
    fireEvent.click(screen.getByRole('button', { name: /record/i }));
    await waitFor(() => expect(mic.start).toHaveBeenCalled());
    unmount();
    expect(mic.cancel).toHaveBeenCalled();
  });
});
