// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { AddPeopleForm } from '../AddPeopleForm.tsx';
import type { AddPeopleState } from '../AddPeopleForm.tsx';
import { writeXlsx } from '../../../lib/sheet/xlsx.ts';

afterEach(cleanup);

const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const done = (created: Extract<AddPeopleState, { kind: 'done' }>['created']): AddPeopleState => ({ kind: 'done', created, existing: [], failed: [] });
const arjun = { fullName: 'Arjun Mehta', email: 'arjun@example.com', password: 'Cadet@2026', phone: '+919876543210', minorWithoutConsent: false };

const upload = (rows: string[][], name = 'people.xlsx') => {
  const bytes = writeXlsx([{ name: 'People', rows }]);
  const file = new File([bytes], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  fireEvent.change(screen.getByLabelText(/upload/i), { target: { files: [file] } });
};

describe('AddPeopleForm — one person', () => {
  it('has a field for each detail, and creates nothing until name, email and date of birth are in', () => {
    render(<AddPeopleForm action={vi.fn()} roles={['candidate']} />);
    for (const label of [/^name$/i, /^email$/i, /date of birth/i, /mobile/i, /^password/i]) expect(screen.getByLabelText(label)).toBeTruthy();
    const create = screen.getByRole('button', { name: /create login/i }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    type(/^name$/i, 'Arjun Mehta');
    type(/^email$/i, 'arjun@example.com');
    type(/date of birth/i, '2005-01-15');
    expect(create.disabled).toBe(false);
  });

  it('says what is wrong with a field before sending', () => {
    render(<AddPeopleForm action={vi.fn()} roles={['candidate']} />);
    type(/^name$/i, 'Arjun Mehta');
    type(/^email$/i, 'arjun@');
    expect(screen.getByText(/valid email/i)).toBeTruthy();
  });

  it('asks about guardian consent only for an under-18', () => {
    render(<AddPeopleForm action={vi.fn()} roles={['candidate']} />);
    type(/date of birth/i, '2000-01-01');
    expect(screen.queryByLabelText(/guardian consent/i)).toBeNull();
    type(/date of birth/i, '2013-01-01');
    expect(screen.getByLabelText(/guardian consent/i)).toBeTruthy();
  });

  it('asks staff for no date of birth', () => {
    render(<AddPeopleForm action={vi.fn()} roles={['mentor']} />);
    expect(screen.queryByLabelText(/date of birth/i)).toBeNull();
  });

  it('offers a role choice only to those who may add more than candidates', () => {
    const { rerender } = render(<AddPeopleForm action={vi.fn()} roles={['candidate']} />);
    expect(screen.queryByLabelText(/^role$/i)).toBeNull();
    rerender(<AddPeopleForm action={vi.fn()} roles={['candidate', 'mentor']} />);
    expect(screen.getByLabelText(/^role$/i)).toBeTruthy();
  });

  it('shows the WhatsApp message once the login is made', async () => {
    const action = vi.fn(async () => done([arjun]));
    render(<AddPeopleForm action={action} roles={['candidate']} />);
    type(/^name$/i, 'Arjun Mehta');
    type(/^email$/i, 'arjun@example.com');
    type(/date of birth/i, '2005-01-15');
    fireEvent.click(screen.getByRole('button', { name: /create login/i }));
    await waitFor(() => expect(screen.getByText(/Password: Cadet@2026/)).toBeTruthy());
    expect((screen.getByRole('link', { name: /whatsapp/i }) as HTMLAnchorElement).href).toMatch(/^https:\/\/wa\.me\/919876543210/);
  });

  it('says so when the email already has a login', async () => {
    const action = vi.fn(async (): Promise<AddPeopleState> => ({ kind: 'done', created: [], existing: ['taken@example.com'], failed: [] }));
    render(<AddPeopleForm action={action} roles={['candidate']} />);
    type(/^name$/i, 'Taken');
    type(/^email$/i, 'taken@example.com');
    type(/date of birth/i, '2005-01-15');
    fireEvent.click(screen.getByRole('button', { name: /create login/i }));
    await waitFor(() => expect(screen.getByText(/already have an account/i)).toBeTruthy());
  });

  it('announces a refusal from the server', async () => {
    const action = vi.fn(async (): Promise<AddPeopleState> => ({ kind: 'error', message: 'You cannot add candidates here.' }));
    render(<AddPeopleForm action={action} roles={['candidate']} />);
    type(/^name$/i, 'Arjun Mehta');
    type(/^email$/i, 'arjun@example.com');
    type(/date of birth/i, '2005-01-15');
    fireEvent.click(screen.getByRole('button', { name: /create login/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/cannot add/));
  });
});

describe('AddPeopleForm — many, from Excel', () => {
  const toMany = () => fireEvent.click(screen.getByRole('tab', { name: /many/i }));

  it('offers the template to download', () => {
    const createObjectURL = vi.fn(() => 'blob:template');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    render(<AddPeopleForm action={vi.fn()} roles={['candidate']} />);
    toMany();
    fireEvent.click(screen.getByRole('button', { name: /download template/i }));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('previews every row, marks each problem by its row number, and counts what is ready', async () => {
    render(<AddPeopleForm action={vi.fn()} roles={['candidate']} />);
    toMany();
    upload([
      ['Name', 'Email', 'Date of birth', 'Mobile', 'Password'],
      ['Cadet One', 'one@example.com', '14/03/2008', '98765 43210', 'Cadet@2026'],
      ['Cadet Two', 'not-an-email', '14/03/2008', '', ''],
    ]);
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Cadet One')).toBeTruthy();
    expect(within(table).getByText(/valid email/i)).toBeTruthy();
    expect(within(table).getByText('3')).toBeTruthy();
    expect(screen.getByText(/1 ready · 1 to fix/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: /create/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('warns when rows share a password, and still allows it', async () => {
    render(<AddPeopleForm action={vi.fn()} roles={['candidate']} />);
    toMany();
    upload([
      ['Name', 'Email', 'Date of birth', 'Password'],
      ['Cadet One', 'one@example.com', '14/03/2008', 'Batch@2026'],
      ['Cadet Two', 'two@example.com', '14/03/2008', 'Batch@2026'],
    ]);
    await screen.findByRole('table');
    expect(screen.getByText(/rows 2 and 3 share a password/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: /create 2 logins/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('says why a file cannot be used', async () => {
    render(<AddPeopleForm action={vi.fn()} roles={['candidate']} />);
    toMany();
    upload([['Student', 'Contact'], ['A', 'x']]);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Name and an Email column/));
  });

  it('lists every new login with its own message and WhatsApp link, and offers them as a file', async () => {
    const action = vi.fn(async () => done([arjun, { ...arjun, fullName: 'Cadet Two', email: 'two@example.com', phone: null }]));
    render(<AddPeopleForm action={action} roles={['candidate']} />);
    toMany();
    upload([
      ['Name', 'Email', 'Date of birth'],
      ['Arjun Mehta', 'arjun@example.com', '14/03/2008'],
      ['Cadet Two', 'two@example.com', '14/03/2008'],
    ]);
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: /create 2 logins/i }));
    await waitFor(() => expect(screen.getByText(/2 logins created/i)).toBeTruthy());
    expect(screen.getAllByRole('button', { name: /copy message for/i })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /whatsapp/i })).toHaveLength(2);
    expect(screen.getByRole('button', { name: /download logins/i })).toBeTruthy();
    const sent = (action.mock.calls[0] as unknown as [AddPeopleState, FormData])[1];
    expect(sent.get('mode')).toBe('many');
    expect(JSON.parse(String(sent.get('rows')))).toHaveLength(2);
  });
});
