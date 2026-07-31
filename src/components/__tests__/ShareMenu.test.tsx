import '@testing-library/jest-dom';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ShareMenu from '../ShareMenu.js';

const X = () => screen.queryByRole('menuitem', { name: 'Share to X' });
const FC = () => screen.queryByRole('menuitem', { name: 'Share to Farcaster' });

describe('ShareMenu — single Share button + icon-only platform popover', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function renderMenu(props: Partial<Parameters<typeof ShareMenu>[0]> = {}) {
    return render(<ShareMenu score={1200} streak={3} {...props} />);
  }

  it('shows only the Share trigger; X/Warpcast are NOT visible before click', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: 'Share score' })).toBeInTheDocument();
    expect(X()).not.toBeInTheDocument();
    expect(FC()).not.toBeInTheDocument();
  });

  it('opens a popover with two icon-only buttons after clicking Share', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Share score' }));
    expect(X()).toBeInTheDocument();
    expect(FC()).toBeInTheDocument();
    // Icon-only: tidak ada tulisan platform yang terlihat.
    expect(screen.queryByText(/warpcast/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/farcaster/i)).not.toBeInTheDocument();
    // Tombol platform bukan anak dari tombol Share (tidak ada bubbling ke trigger).
    const trigger = screen.getByRole('button', { name: 'Share score' });
    expect(trigger.contains(X() as Element)).toBe(false);
  });

  it('clicks X -> opens x.com intent with score + game URL, then closes', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Share score' }));
    fireEvent.click(X() as Element);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toMatch(/^https:\/\/x\.com\/intent\/post\?/);
    expect(url).toContain(encodeURIComponent('1200'));
    expect(url).toContain(encodeURIComponent('https://base-block.biz.id'));
    expect(X()).not.toBeInTheDocument();
  });

  it('clicks Farcaster -> opens warpcast composer with embed, then closes', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Share score' }));
    fireEvent.click(FC() as Element);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toMatch(/^https:\/\/warpcast\.com\/~\/compose\?/);
    expect(url).toContain('embeds%5B%5D=');
    expect(url).toContain(encodeURIComponent('1200'));
    expect(FC()).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Share score' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(X()).not.toBeInTheDocument();
  });

  it('closes when clicking outside the menu', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Share score' }));
    fireEvent.pointerDown(document.body);
    expect(X()).not.toBeInTheDocument();
  });

  it('re-clicking Share toggles the popover closed', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Share score' });
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(X()).not.toBeInTheDocument();
  });

  it('uses the latest score value passed in (no stale closure)', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { rerender } = render(<ShareMenu score={500} />);
    rerender(<ShareMenu score={2500} />);
    fireEvent.click(screen.getByRole('button', { name: 'Share score' }));
    fireEvent.click(X() as Element);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain(encodeURIComponent('2500'));
  });
});
