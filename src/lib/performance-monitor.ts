/**
 * Performance monitoring utilities
 * Tracks and reports performance metrics
 */

import { useRef, useEffect } from 'react';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private renderMetrics: ComponentRenderMetric[] = [];
  private maxMetrics = 100;

  /**
   * Measure function execution time
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'ms');
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration, 'ms');
      throw error;
    }
  }

  /**
   * Record performance metric
   */
  recordMetric(name: string, value: number, unit: string = 'ms'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value.toFixed(2)}${unit}`);
    }
  }

  /**
   * Record component render time
   */
  recordRender(componentName: string, renderTime: number): void {
    const metric: ComponentRenderMetric = {
      componentName,
      renderTime,
      timestamp: Date.now(),
    };

    this.renderMetrics.push(metric);
    if (this.renderMetrics.length > this.maxMetrics) {
      this.renderMetrics.shift();
    }
  }

  /**
   * Get Web Vitals metrics
   */
  getWebVitals(): {
    fcp?: number; // First Contentful Paint
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
    ttfb?: number; // Time to First Byte
  } {
    const vitals: any = {};

    if ('PerformanceObserver' in window) {
      // FCP
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (e) {
        // Ignore
      }

      // LCP
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          vitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // Ignore
      }

      // FID
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any) {
            vitals.fid = entry.processingStart - entry.startTime;
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // Ignore
      }

      // CLS
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          vitals.cls = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // Ignore
      }
    }

    // TTFB
    if (performance.timing) {
      vitals.ttfb = performance.timing.responseStart - performance.timing.requestStart;
    }

    return vitals;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get render metrics
   */
  getRenderMetrics(): ComponentRenderMetric[] {
    return [...this.renderMetrics];
  }

  /**
   * Get average render time for component
   */
  getAverageRenderTime(componentName: string): number {
    const renders = this.renderMetrics.filter(m => m.componentName === componentName);
    if (renders.length === 0) return 0;
    
    const total = renders.reduce((sum, m) => sum + m.renderTime, 0);
    return total / renders.length;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.renderMetrics = [];
  }

  /**
   * Report metrics to external service
   */
  reportMetrics(): void {
    const vitals = this.getWebVitals();
    const metrics = this.getMetrics();
    
    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to analytics
      // fetch('/api/analytics/performance', {
      //   method: 'POST',
      //   body: JSON.stringify({ vitals, metrics }),
      // });
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook to measure component render time
 */
export function useRenderTime(componentName: string) {
  const renderStartRef = useRef<number>(0);

  useEffect(() => {
    renderStartRef.current = performance.now();
  });

  useEffect(() => {
    const renderTime = performance.now() - renderStartRef.current;
    performanceMonitor.recordRender(componentName, renderTime);
  });
}

