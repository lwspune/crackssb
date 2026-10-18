// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PasswordField } from '../PasswordField.tsx';
import { PASSWORD_ALPHABET } from '../../../lib/auth/password.ts';

afterEach(cleanup);

describe('PasswordField', () => {
  it('is typed into, hidden until shown', () => {
    render(<PasswordField id="pw" name="password" label="Password" who={{ email: 'a@example.com', fullName: 'A B' }} />);
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(input.type).toBe('text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeTruthy();
  });

  it('generates one on request, shown so it can be read out', () => {
    render(<PasswordField id="pw" name="password" label="Password" who={{ email: 'a@example.com', fullName: 'A B' }} />);
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.value).toHaveLength(16);
    for (const c of input.value) expect(PASSWORD_ALPHABET).toContain(c);
    expect(input.type).toBe('text');
  });

  it('says what is wrong with a typed one', () => {
    render(<PasswordField id="pw" name="password" label="Password" who={{ email: 'a@example.com', fullName: 'A B' }} />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    expect(screen.getByText(/at least 8/i)).toBeTruthy();
  });
});
