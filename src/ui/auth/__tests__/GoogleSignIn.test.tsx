// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { GoogleSignIn } from '../GoogleSignIn.tsx';

afterEach(cleanup);

describe('GoogleSignIn', () => {
  it('is one button, named for what it does', () => {
    render(<GoogleSignIn action={vi.fn()} next={null} />);
    const button = screen.getByRole('button', { name: 'Continue with Google' });
    expect((button as HTMLButtonElement).type).toBe('submit');
  });

  it('carries the page the user was trying to reach', () => {
    const { container } = render(<GoogleSignIn action={vi.fn()} next="/practise" />);
    expect((container.querySelector('input[name="next"]') as HTMLInputElement).value).toBe('/practise');
  });

  it('sends nothing for next when there is none', () => {
    const { container } = render(<GoogleSignIn action={vi.fn()} next={null} />);
    expect(container.querySelector('input[name="next"]')).toBeNull();
  });

  it('calls the action once and says it is on its way', async () => {
    let release = () => {};
    const action = vi.fn(() => new Promise<void>((r) => { release = r; }));
    render(<GoogleSignIn action={action} next={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(screen.getByRole('button').textContent).toMatch(/opening google/i));
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    expect(action).toHaveBeenCalledOnce();
    release();
  });
});
