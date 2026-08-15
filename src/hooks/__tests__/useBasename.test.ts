import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useBasename, clearBasenameCache } from '../useBasename.js';

describe('useBasename hook', () => {
  beforeEach(() => {
    clearBasenameCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns formatted truncated address when address is provided and no Basename found', async () => {
    const fakeAddress = '0x1234567890abcdef1234567890abcdef12345678';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useBasename(fakeAddress));

    expect(result.current.displayName).toBe('0x1234...5678');
    expect(result.current.isBasename).toBe(false);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.displayName).toBe('0x1234...5678');
    expect(result.current.isBasename).toBe(false);
  });

  it('resolves Basename when API returns ens/title metadata', async () => {
    const fakeAddress = '0x1111222233334444555566667777888899990000';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ens: 'builder.base.eth', avatar: 'https://avatar.png' }),
    });

    const { result } = renderHook(() => useBasename(fakeAddress));

    await waitFor(() => {
      expect(result.current.displayName).toBe('builder.base.eth');
    });

    expect(result.current.isBasename).toBe(true);
    expect(result.current.avatarUrl).toBe('https://avatar.png');
    expect(result.current.isLoading).toBe(false);
  });

  it('handles empty address gracefully', () => {
    const { result } = renderHook(() => useBasename(undefined));

    expect(result.current.displayName).toBe('');
    expect(result.current.isBasename).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
