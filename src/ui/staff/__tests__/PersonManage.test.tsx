// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { PersonManage } from '../PersonManage.tsx';
import type { ManageActions, ManagedPerson, Rights } from '../PersonManage.tsx';

afterEach(cleanup);

const person: ManagedPerson = {
  id: 'p1', fullName: 'Arjun Mehta', email: 'arjun@example.com', role: 'candidate',
  dob: '2005-01-15', phone: '+919876543210', needsConsent: false, deactivated: false,
};
const all: Rights = { edit: true, password: true, deactivate: true, delete: true, role: false };
const none: Rights = { edit: false, password: false, deactivate: false, delete: false, role: false };

const actions = (over: Partial<ManageActions> = {}): ManageActions => ({
  details: vi.fn(async () => ({ kind: 'saved' as const, message: 'Saved.' })),
  password: vi.fn(async () => ({ kind: 'idle' as const })),
  consent: vi.fn(async () => ({ kind: 'saved' as const, message: 'Recorded.' })),
  role: vi.fn(async () => ({ kind: 'saved' as const, message: 'Saved.' })),
  active: vi.fn(async () => ({ kind: 'saved' as const, message: 'Saved.' })),
  remove: vi.fn(async () => ({ kind: 'saved' as const, message: 'Removed.' })),
  ...over,
});

describe('PersonManage', () => {
  it('offers only what the database says the viewer may do', () => {
    render(<PersonManage person={person} rights={{ ...none, edit: true, password: true }} actions={actions()} />);
    expect(screen.getByRole('button', { name: /save details/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /set password/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /switch off/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();
    expect(screen.queryByLabelText(/^role$/i)).toBeNull();
  });

  it('shows the WhatsApp message once a password is set', async () => {
    const password = vi.fn(async () => ({
      kind: 'done' as const,
      login: { fullName: 'Arjun Mehta', email: 'arjun@example.com', password: 'Fresh@2026', needsConsent: false },
      phone: '+919876543210',
    }));
    render(<PersonManage person={person} rights={all} actions={actions({ password })} />);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'Fresh@2026' } });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));
    await waitFor(() => expect(screen.getByText(/Password: Fresh@2026/)).toBeTruthy());
    expect(screen.getByRole('link', { name: /whatsapp/i })).toBeTruthy();
  });

  it('asks before removing, and only removes on the second click', async () => {
    const remove = vi.fn(async () => ({ kind: 'saved' as const, message: 'Removed.' }));
    render(<PersonManage person={person} rights={all} actions={actions({ remove })} />);
    fireEvent.click(screen.getByRole('button', { name: /^remove login$/i }));
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByText(/cannot be undone/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /yes, remove/i }));
    await waitFor(() => expect(remove).toHaveBeenCalled());
  });

  it('offers to switch a switched-off login back on', () => {
    render(<PersonManage person={{ ...person, deactivated: true }} rights={all} actions={actions()} />);
    expect(screen.getByRole('button', { name: /switch on/i })).toBeTruthy();
  });

  it('records guardian consent for an under-18 without it', () => {
    render(<PersonManage person={{ ...person, needsConsent: true }} rights={all} actions={actions()} />);
    expect(screen.getByRole('button', { name: /record guardian consent/i })).toBeTruthy();
  });

  it('keeps the consent confirmation when the page refreshes without the need for it', async () => {
    const a = actions();
    const { rerender } = render(<PersonManage person={{ ...person, needsConsent: true }} rights={all} actions={a} />);
    fireEvent.click(screen.getByRole('button', { name: /record guardian consent/i }));
    await waitFor(() => expect(screen.getByText('Recorded.')).toBeTruthy());
    rerender(<PersonManage person={{ ...person, needsConsent: false }} rights={all} actions={a} />);
    expect(screen.getByText('Recorded.')).toBeTruthy();
  });

  it('lets the superadmin move a mentor to academy owner', () => {
    render(<PersonManage person={{ ...person, role: 'mentor', dob: null }} rights={{ ...all, role: true }} actions={actions()} />);
    expect(screen.getByLabelText(/^role$/i)).toBeTruthy();
  });

  it('announces a refusal', async () => {
    const details = vi.fn(async () => ({ kind: 'error' as const, message: 'You cannot change this person.' }));
    render(<PersonManage person={person} rights={all} actions={actions({ details })} />);
    fireEvent.click(screen.getByRole('button', { name: /save details/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/cannot change/));
  });
});
