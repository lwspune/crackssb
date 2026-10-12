// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { AddPeopleForm } from '../AddPeopleForm.tsx';
import type { AddPeopleState } from '../AddPeopleForm.tsx';

afterEach(cleanup);

const paste = (text: string) => fireEvent.change(screen.getByLabelText(/one person per line/i), { target: { value: text } });

describe('AddPeopleForm', () => {
  it('counts the good lines and names the bad ones before anything is sent', () => {
    render(<AddPeopleForm action={vi.fn()} roles={['candidate']} />);
    paste('Cadet One, one@example.com, 2007-03-14\nBroken line');
    expect(screen.getByRole('button', { name: /create 1 login/i })).toBeTruthy();
    expect(screen.getByText(/line 2/i)).toBeTruthy();
  });

  it('cannot be sent with nothing valid in it', () => {
    render(<AddPeopleForm action={vi.fn()} roles={['candidate']} />);
    expect((screen.getByRole('button', { name: /create/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('asks about guardian consent only when the list has someone under 18', () => {
    render(<AddPeopleForm action={vi.fn()} roles={['candidate']} />);
    paste('Adult Cadet, adult@example.com, 2000-01-01');
    expect(screen.queryByLabelText(/guardian consent/i)).toBeNull();
    paste('Young Cadet, young@example.com, 2012-01-01');
    expect(screen.getByLabelText(/guardian consent/i)).toBeTruthy();
  });

  it('offers a role choice only to those who may add more than candidates', () => {
    const { rerender } = render(<AddPeopleForm action={vi.fn()} roles={['candidate']} />);
    expect(screen.queryByLabelText(/^role$/i)).toBeNull();
    rerender(<AddPeopleForm action={vi.fn()} roles={['candidate', 'mentor']} />);
    expect(screen.getByLabelText(/^role$/i)).toBeTruthy();
  });

  it('shows each new password once, and leaves existing accounts alone', async () => {
    const done: AddPeopleState = {
      kind: 'done',
      created: [{ fullName: 'Cadet One', email: 'one@example.com', password: 'Abc23defGhjk4567', minorWithoutConsent: false }],
      existing: ['taken@example.com'],
      failed: [],
    };
    const action = vi.fn(async () => done);
    render(<AddPeopleForm action={action} roles={['candidate']} />);
    paste('Cadet One, one@example.com, 2007-03-14\nTaken, taken@example.com, 2007-03-14');
    fireEvent.click(screen.getByRole('button', { name: /create 2 logins/i }));
    await waitFor(() => expect(screen.getByText('Abc23defGhjk4567')).toBeTruthy());
    expect(screen.getByText(/shown once/i)).toBeTruthy();
    expect(screen.getByText(/taken@example.com/)).toBeTruthy();
    expect(screen.getByText(/not changed/i)).toBeTruthy();
  });

  it('announces a refusal from the server', async () => {
    const action = vi.fn(async (): Promise<AddPeopleState> => ({ kind: 'error', message: 'You cannot add people to that academy.' }));
    render(<AddPeopleForm action={action} roles={['candidate']} />);
    paste('Cadet One, one@example.com, 2007-03-14');
    fireEvent.click(screen.getByRole('button', { name: /create 1 login/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/cannot add people/));
  });
});
