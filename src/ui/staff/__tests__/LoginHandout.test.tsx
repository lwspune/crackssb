// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { LoginHandout } from '../LoginHandout.tsx';

afterEach(cleanup);

const login = { fullName: 'Arjun Mehta', email: 'arjun@example.com', password: 'Cadet@2026', needsConsent: false };

describe('LoginHandout', () => {
  it('shows the message to send, password included', () => {
    render(<LoginHandout login={login} phone={null} />);
    expect(screen.getByText(/Password: Cadet@2026/)).toBeTruthy();
    expect(screen.getByText(/shown once/i)).toBeTruthy();
  });

  it('copies the whole message', async () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    render(<LoginHandout login={login} phone={null} />);
    fireEvent.click(screen.getByRole('button', { name: /copy message/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /copied/i })).toBeTruthy());
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^Hi Arjun, [\s\S]*Password: Cadet@2026$/));
  });

  it('opens WhatsApp at the person’s own chat when there is a number', () => {
    render(<LoginHandout login={login} phone="+919876543210" />);
    const link = screen.getByRole('link', { name: /whatsapp/i }) as HTMLAnchorElement;
    expect(link.href).toMatch(/^https:\/\/wa\.me\/919876543210\?text=Hi%20Arjun/);
    expect(link.rel).toMatch(/noopener/);
  });

  it('still offers WhatsApp without a number', () => {
    render(<LoginHandout login={login} phone={null} />);
    expect((screen.getByRole('link', { name: /whatsapp/i }) as HTMLAnchorElement).href).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });
});
