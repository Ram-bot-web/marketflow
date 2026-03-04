/**
 * Batch operations utilities
 * Provides efficient batch writes to Firestore
 */

import { 
  writeBatch, 
  doc, 
  collection,
  Firestore,
  DocumentReference,
} from 'firebase/firestore';

export interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  ref: DocumentReference;
  data?: any;
}

/**
 * Execute batch operations
 * Firestore allows up to 500 operations per batch
 */
export async function executeBatch(
  db: Firestore,
  operations: BatchOperation[]
): Promise<void> {
  const MAX_BATCH_SIZE = 500;
  
  if (operations.length === 0) {
    return;
  }
  
  if (operations.length > MAX_BATCH_SIZE) {
    // Split into multiple batches
    for (let i = 0; i < operations.length; i += MAX_BATCH_SIZE) {
      const batch = operations.slice(i, i + MAX_BATCH_SIZE);
      await executeSingleBatch(db, batch);
    }
  } else {
    await executeSingleBatch(db, operations);
  }
}

/**
 * Execute a single batch
 */
async function executeSingleBatch(
  db: Firestore,
  operations: BatchOperation[]
): Promise<void> {
  const batch = writeBatch(db);
  
  operations.forEach(op => {
    switch (op.type) {
      case 'set':
        batch.set(op.ref, op.data || {});
        break;
      case 'update':
        batch.update(op.ref, op.data || {});
        break;
      case 'delete':
        batch.delete(op.ref);
        break;
    }
  });
  
  await batch.commit();
}

/**
 * Create batch operations from data
 */
export function createBatchOperations(
  db: Firestore,
  collectionPath: string,
  items: Array<{ id?: string; data: any }>,
  operation: 'set' | 'update' = 'set'
): BatchOperation[] {
  return items.map(item => ({
    type: operation,
    ref: item.id 
      ? doc(db, collectionPath, item.id)
      : doc(collection(db, collectionPath)),
    data: item.data,
  }));
}

/**
 * Batch delete helper
 */
export function createDeleteOperations(
  refs: DocumentReference[]
): BatchOperation[] {
  return refs.map(ref => ({
    type: 'delete',
    ref,
  }));
}



