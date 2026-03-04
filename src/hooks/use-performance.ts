/**
 * Performance monitoring hooks
 */

import { useEffect, useRef } from 'react';
import { performanceMonitor } from '@/lib/performance-monitor';

/**
 * Measure component render performance
 */
export function usePerformance(componentName: string) {
  const renderStartRef = useRef<number>(0);

  useEffect(() => {
    renderStartRef.current = performance.now();
  });

  useEffect(() => {
    const renderTime = performance.now() - renderStartRef.current;
    performanceMonitor.recordRender(componentName, renderTime);
  });
}

/**
 * Measure async operation performance
 */
export function useAsyncPerformance<T>(
  operation: () => Promise<T>,
  operationName: string
): () => Promise<T> {
  return async () => {
    return performanceMonitor.measure(operationName, operation);
  };
}



