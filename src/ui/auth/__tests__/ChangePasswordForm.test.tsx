// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ChangePasswordForm } from '../ChangePasswordForm.tsx';
import type { ChangePasswordState } from '../ChangePasswordForm.tsx';

afterEach(cleanup);

const who = { email: 'arjun@example.com', fullName: 'Arjun Mehta' };

describe('ChangePasswordForm', () => {
  it('asks for the current password and a new one', () => {
    render(<ChangePasswordForm action={vi.fn()} who={who} />);
    expect((screen.getByLabelText(/current password/i) as HTMLInputElement).autocomplete).toBe('current-password');
    expect((screen.getByLabelText(/^new password$/i) as HTMLInputElement).autocomplete).toBe('new-password');
  });

  it('says when it is done', async () => {
    const action = vi.fn(async (): Promise<ChangePasswordState> => ({ kind: 'done' }));
    render(<ChangePasswordForm action={action} who={who} />);
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/changed/i));
  });

  it('announces a wrong current password', async () => {
    const action = vi.fn(async (): Promise<ChangePasswordState> => ({ kind: 'error', message: 'Your current password is wrong.' }));
    render(<ChangePasswordForm action={action} who={who} />);
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/current password is wrong/));
  });
});
