import { useState, useEffect } from 'react';

// In-memory cache to avoid refetching resolved Basenames
const basenameCache = new Map<string, string | null>();
const avatarCache = new Map<string, string | null>();

interface BasenameResult {
  displayName: string;
  isBasename: boolean;
  avatarUrl: string | null;
  isLoading: boolean;
}

/**
 * Hook to resolve an Ethereum / Base address to its Basename (.base.eth) and avatar.
 * Falls back to truncated hex address (e.g. 0x1234...5678).
 */
export function useBasename(address?: string): BasenameResult {
  const normalized = address?.toLowerCase() ?? '';
  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  const [basename, setBasename] = useState<string | null>(() => {
    return normalized ? basenameCache.get(normalized) ?? null : null;
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    return normalized ? avatarCache.get(normalized) ?? null : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return !!normalized && !basenameCache.has(normalized);
  });

  useEffect(() => {
    if (!normalized || !address) {
      setBasename(null);
      setAvatarUrl(null);
      setIsLoading(false);
      return;
    }

    if (basenameCache.has(normalized)) {
      setBasename(basenameCache.get(normalized) ?? null);
      setAvatarUrl(avatarCache.get(normalized) ?? null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    async function resolve() {
      try {
        // Query ENS/Basename metadata endpoint
        const res = await fetch(`https://api.ensdata.net/${address}`, {
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          const resolvedName: string | null = data?.ens || data?.title || null;
          const resolvedAvatar: string | null = data?.avatar || data?.avatar_url || null;

          basenameCache.set(normalized, resolvedName);
          avatarCache.set(normalized, resolvedAvatar);

          if (isMounted) {
            setBasename(resolvedName);
            setAvatarUrl(resolvedAvatar);
          }
          return;
        }
      } catch {
        // Fallback gracefully on network error or timeout
      } finally {
        clearTimeout(timeoutId);
        if (!basenameCache.has(normalized)) {
          basenameCache.set(normalized, null);
        }
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    resolve();

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [normalized, address]);

  return {
    displayName: basename || truncated,
    isBasename: !!basename,
    avatarUrl,
    isLoading,
  };
}

export function clearBasenameCache(): void {
  basenameCache.clear();
  avatarCache.clear();
}
