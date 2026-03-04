/**
 * Progressive loading hook
 * Loads data in chunks for better perceived performance
 */

import { useState, useEffect, useCallback } from 'react';

export interface ProgressiveLoadOptions<T> {
  items: T[];
  chunkSize?: number;
  initialChunk?: number;
  delay?: number;
}

export function useProgressiveLoading<T>({
  items,
  chunkSize = 10,
  initialChunk = 1,
  delay = 50,
}: ProgressiveLoadOptions<T>) {
  const [loadedItems, setLoadedItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (items.length === 0) {
      setLoadedItems([]);
      setIsLoading(false);
      setHasMore(false);
      return;
    }

    // Load initial chunk immediately
    const initialCount = chunkSize * initialChunk;
    const initial = items.slice(0, initialCount);
    setLoadedItems(initial);
    setIsLoading(initial.length < items.length);
    setHasMore(initial.length < items.length);

    // Load remaining chunks progressively
    if (initial.length < items.length) {
      let currentIndex = initialCount;
      const loadNextChunk = () => {
        if (currentIndex >= items.length) {
          setIsLoading(false);
          setHasMore(false);
          return;
        }

        const nextChunk = items.slice(currentIndex, currentIndex + chunkSize);
        setLoadedItems(prev => [...prev, ...nextChunk]);
        currentIndex += chunkSize;
        setIsLoading(currentIndex < items.length);
        setHasMore(currentIndex < items.length);

        if (currentIndex < items.length) {
          setTimeout(loadNextChunk, delay);
        }
      };

      setTimeout(loadNextChunk, delay);
    }
  }, [items, chunkSize, initialChunk, delay]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;

    const currentLength = loadedItems.length;
    const nextChunk = items.slice(currentLength, currentLength + chunkSize);
    
    if (nextChunk.length > 0) {
      setLoadedItems(prev => [...prev, ...nextChunk]);
      setHasMore(currentLength + nextChunk.length < items.length);
    } else {
      setHasMore(false);
    }
  }, [items, loadedItems.length, chunkSize, hasMore, isLoading]);

  return {
    items: loadedItems,
    isLoading,
    hasMore,
    loadMore,
    totalItems: items.length,
    loadedCount: loadedItems.length,
  };
}



