/**
 * Connection management utilities
 * Manages Firestore subscriptions and connection state
 */

import { useEffect, useRef, useState } from 'react';
import { Unsubscribe } from 'firebase/firestore';

interface Subscription {
  id: string;
  unsubscribe: Unsubscribe;
  active: boolean;
}

class ConnectionManager {
  private subscriptions = new Map<string, Subscription>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Register a subscription
   */
  register(id: string, unsubscribe: Unsubscribe): void {
    this.subscriptions.set(id, {
      id,
      unsubscribe,
      active: true,
    });
  }

  /**
   * Unregister a subscription
   */
  unregister(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(id);
    }
  }

  /**
   * Unregister all subscriptions
   */
  unregisterAll(): void {
    this.subscriptions.forEach(sub => {
      sub.unsubscribe();
    });
    this.subscriptions.clear();
  }

  /**
   * Get active subscription count
   */
  getActiveCount(): number {
    return Array.from(this.subscriptions.values()).filter(sub => sub.active).length;
  }

  /**
   * Get all subscription IDs
   */
  getSubscriptionIds(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Cleanup inactive subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach((sub, id) => {
      if (!sub.active) {
        sub.unsubscribe();
        this.subscriptions.delete(id);
      }
    });
  }
}

// Create singleton instance
export const connectionManager = new ConnectionManager();

/**
 * Hook to manage Firestore subscriptions
 */
export function useFirestoreSubscription<T>(
  subscribeFn: (callback: (data: T) => void) => Unsubscribe,
  dependencies: any[] = []
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const subscriptionIdRef = useRef<string>(`sub_${Date.now()}_${Math.random()}`);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Unsubscribe from previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      connectionManager.unregister(subscriptionIdRef.current);
    }

    try {
      const unsubscribe = subscribeFn((newData) => {
        setData(newData);
        setLoading(false);
        setError(null);
      });

      unsubscribeRef.current = unsubscribe;
      connectionManager.register(subscriptionIdRef.current, unsubscribe);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Subscription failed'));
      setLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        connectionManager.unregister(subscriptionIdRef.current);
      }
    };
  }, dependencies);

  return { data, loading, error };
}

/**
 * Batch unsubscribe helper
 */
export function batchUnsubscribe(ids: string[]): void {
  ids.forEach(id => connectionManager.unregister(id));
}

/**
 * Cleanup all subscriptions on page unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    connectionManager.unregisterAll();
  });
}



