// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { LoginForm } from '../LoginForm.tsx';

afterEach(cleanup);

describe('LoginForm', () => {
  it('labels both fields and hints them for password managers', () => {
    render(<LoginForm action={vi.fn()} next={null} />);
    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    const password = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(email.type).toBe('email');
    expect(email.autocomplete).toBe('username');
    expect(password.type).toBe('password');
    expect(password.autocomplete).toBe('current-password');
  });

  it('carries the page the user was trying to reach', () => {
    const { container } = render(<LoginForm action={vi.fn()} next="/practise" />);
    expect((container.querySelector('input[name="next"]') as HTMLInputElement).value).toBe('/practise');
  });

  it('announces the error the server returns', async () => {
    const action = vi.fn(async () => ({ error: 'Email or password is wrong.' }));
    render(<LoginForm action={action} next={null} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Email or password is wrong.'));
    expect(action).toHaveBeenCalledOnce();
  });

  it('shows no error before the first attempt', () => {
    render(<LoginForm action={vi.fn()} next={null} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
