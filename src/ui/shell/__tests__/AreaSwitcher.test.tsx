// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AreaSwitcher } from '../AreaSwitcher.tsx';

afterEach(cleanup);

/** The switch between the areas a role may use (D25). */
describe('AreaSwitcher', () => {
  it('shows nothing to a role with one area', () => {
    const { container } = render(<AreaSwitcher areas={['student']} current="student" />);
    expect(container.textContent).toBe('');
  });

  it('offers exactly the areas given, in order, linking to each one’s home', () => {
    render(<AreaSwitcher areas={['admin', 'staff', 'student']} current="admin" />);
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(['Admin', 'Staff', 'Student']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/admin', '/staff', '/']);
  });

  it('marks the area you are in', () => {
    render(<AreaSwitcher areas={['staff', 'student']} current="student" />);
    expect(screen.getByRole('link', { name: 'Student' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Staff' }).getAttribute('aria-current')).toBeNull();
  });

  it('is a labelled navigation landmark', () => {
    render(<AreaSwitcher areas={['staff', 'student']} current="staff" />);
    expect(screen.getByRole('navigation', { name: /switch area/i })).toBeTruthy();
  });
});
