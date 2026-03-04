/**
 * Background sync utilities
 * Syncs data when connection is restored
 */

import { useState, useEffect } from 'react';

interface SyncTask {
  id: string;
  action: () => Promise<void>;
  retries: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
}

class BackgroundSync {
  private queue: SyncTask[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  /**
   * Add task to sync queue
   */
  addTask(
    id: string,
    action: () => Promise<void>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    // Remove existing task with same ID
    this.queue = this.queue.filter(task => task.id !== id);

    // Add new task
    this.queue.push({
      id,
      action,
      retries: 0,
      maxRetries: this.maxRetries,
      priority,
    });

    // Sort by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;

      try {
        await task.action();
        // Task completed successfully
      } catch (error) {
        // Retry if attempts remaining
        if (task.retries < task.maxRetries) {
          task.retries++;
          this.queue.push(task);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        } else {
          // Max retries reached, log error
          console.error('Background sync task failed after max retries:', task.id, error);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      tasks: this.queue.map(t => ({
        id: t.id,
        retries: t.retries,
        priority: t.priority,
      })),
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
  }
}

// Create singleton instance
export const backgroundSync = new BackgroundSync();

/**
 * Register sync task
 */
export function registerSyncTask(
  id: string,
  action: () => Promise<void>,
  priority: 'high' | 'medium' | 'low' = 'medium'
): void {
  backgroundSync.addTask(id, action, priority);
}

/**
 * Hook to monitor sync status
 */
export function useSyncStatus() {
  const [status, setStatus] = useState(backgroundSync.getStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(backgroundSync.getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return status;
}

