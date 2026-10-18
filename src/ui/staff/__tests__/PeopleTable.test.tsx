// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PeopleTable } from '../PeopleTable.tsx';
import type { PersonRow } from '../PeopleTable.tsx';

afterEach(cleanup);

const row: PersonRow = {
  id: '11111111-1111-4111-8111-111111111111', full_name: 'Arjun Mehta', email: 'arjun@example.com', role: 'candidate',
  dob: '2000-01-01', guardian_consent_at: null, deactivated_at: null, created_at: '2026-10-01T00:00:00Z',
};

describe('PeopleTable', () => {
  it('opens each person’s page', () => {
    render(<PeopleTable people={[row]} />);
    expect((screen.getByRole('link', { name: /arjun mehta/i }) as HTMLAnchorElement).getAttribute('href')).toBe(`/staff/people/${row.id}`);
  });

  it('marks a switched-off login', () => {
    render(<PeopleTable people={[{ ...row, deactivated_at: '2026-10-18T00:00:00Z' }]} />);
    expect(screen.getByText(/switched off/i)).toBeTruthy();
  });
});
