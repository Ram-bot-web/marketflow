/**
 * Data prefetching hook
 * Prefetches data before it's needed
 */

import { useEffect, useRef } from 'react';
import { cache, cacheKeys } from '@/lib/cache';

export interface PrefetchOptions {
  key: string;
  fetcher: () => Promise<any>;
  ttl?: number;
  condition?: () => boolean;
}

/**
 * Prefetch data hook
 * Prefetches data when condition is met
 */
export function usePrefetch(options: PrefetchOptions) {
  const { key, fetcher, ttl, condition } = options;
  const prefetchedRef = useRef(false);

  useEffect(() => {
    // Check if condition is met
    if (condition && !condition()) {
      return;
    }

    // Check if already cached
    if (cache.has(key)) {
      return;
    }

    // Check if already prefetched in this session
    if (prefetchedRef.current) {
      return;
    }

    // Prefetch in background
    prefetchedRef.current = true;
    fetcher()
      .then(data => {
        cache.set(key, data, ttl);
      })
      .catch(error => {
        console.warn('Prefetch failed:', error);
        prefetchedRef.current = false; // Allow retry
      });
  }, [key, fetcher, ttl, condition]);
}

/**
 * Prefetch on hover
 */
export function usePrefetchOnHover(options: PrefetchOptions) {
  const { key, fetcher, ttl } = options;
  const prefetchedRef = useRef(false);

  const handleMouseEnter = () => {
    if (prefetchedRef.current || cache.has(key)) {
      return;
    }

    prefetchedRef.current = true;
    fetcher()
      .then(data => {
        cache.set(key, data, ttl);
      })
      .catch(error => {
        console.warn('Prefetch on hover failed:', error);
        prefetchedRef.current = false;
      });
  };

  return { onMouseEnter: handleMouseEnter };
}

/**
 * Prefetch on link hover
 */
export function useLinkPrefetch(href: string, fetcher: () => Promise<any>) {
  const prefetchedRef = useRef(false);

  const handleMouseEnter = () => {
    if (prefetchedRef.current) {
      return;
    }

    prefetchedRef.current = true;
    fetcher()
      .catch(error => {
        console.warn('Link prefetch failed:', error);
        prefetchedRef.current = false;
      });
  };

  return { onMouseEnter: handleMouseEnter };
}



