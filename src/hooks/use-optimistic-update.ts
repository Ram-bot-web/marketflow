/**
 * Optimistic update hook
 * Updates UI immediately, then syncs with server
 */

import { useState, useCallback, useRef } from 'react';

export interface OptimisticUpdateOptions<T> {
  initialValue: T;
  onUpdate: (value: T) => Promise<T>;
  onError?: (error: Error, rollbackValue: T) => void;
}

export function useOptimisticUpdate<T>({
  initialValue,
  onUpdate,
  onError,
}: OptimisticUpdateOptions<T>) {
  const [value, setValue] = useState<T>(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const rollbackRef = useRef<T>(initialValue);

  const update = useCallback(async (newValue: T) => {
    // Store current value for rollback
    rollbackRef.current = value;
    
    // Optimistically update UI
    setValue(newValue);
    setIsUpdating(true);
    setError(null);

    try {
      // Sync with server
      const serverValue = await onUpdate(newValue);
      
      // Update with server response (in case server modified the value)
      setValue(serverValue);
      setIsUpdating(false);
      
      return serverValue;
    } catch (err) {
      // Rollback on error
      const error = err instanceof Error ? err : new Error('Update failed');
      setValue(rollbackRef.current);
      setError(error);
      setIsUpdating(false);
      
      if (onError) {
        onError(error, rollbackRef.current);
      }
      
      throw error;
    }
  }, [value, onUpdate, onError]);

  const reset = useCallback(() => {
    setValue(initialValue);
    rollbackRef.current = initialValue;
    setError(null);
    setIsUpdating(false);
  }, [initialValue]);

  return {
    value,
    update,
    reset,
    isUpdating,
    error,
  };
}



