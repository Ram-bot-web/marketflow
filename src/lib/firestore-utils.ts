/**
 * Firestore optimization utilities
 * Provides optimized queries, pagination, and caching
 */

import { 
  Query, 
  QueryConstraint, 
  limit, 
  startAfter, 
  orderBy,
  where,
  DocumentSnapshot,
  getDocs,
  query as firestoreQuery,
  CollectionReference,
} from 'firebase/firestore';

export interface PaginationOptions {
  pageSize: number;
  startAfterDoc?: DocumentSnapshot;
}

export interface PaginatedResult<T> {
  data: T[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Optimized paginated query
 */
export async function getPaginatedData<T>(
  collectionRef: CollectionReference<T>,
  constraints: QueryConstraint[] = [],
  options: PaginationOptions
): Promise<PaginatedResult<T>> {
  const { pageSize, startAfterDoc } = options;
  
  let q: Query<T> = firestoreQuery(collectionRef, ...constraints);
  
  // Add pagination constraints
  if (startAfterDoc) {
    q = firestoreQuery(q, startAfter(startAfterDoc), limit(pageSize + 1));
  } else {
    q = firestoreQuery(q, limit(pageSize + 1));
  }
  
  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  
  // Remove the extra doc if we have more
  const data = (hasMore ? docs.slice(0, pageSize) : docs).map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];
  
  const lastDoc = docs.length > 0 ? docs[Math.min(pageSize - 1, docs.length - 1)] : null;
  
  return {
    data,
    lastDoc,
    hasMore,
  };
}

/**
 * Create optimized query with common patterns
 */
export function createOptimizedQuery<T>(
  collectionRef: CollectionReference<T>,
  filters: {
    where?: Array<[string, any, any]>;
    orderBy?: Array<[string, 'asc' | 'desc']>;
    limitCount?: number;
  } = {}
): Query<T> {
  const constraints: QueryConstraint[] = [];
  
  // Add where clauses
  if (filters.where) {
    filters.where.forEach(([field, op, value]) => {
      constraints.push(where(field, op, value));
    });
  }
  
  // Add orderBy clauses
  if (filters.orderBy) {
    filters.orderBy.forEach(([field, direction]) => {
      constraints.push(orderBy(field, direction));
    });
  }
  
  // Add limit
  if (filters.limitCount) {
    constraints.push(limit(filters.limitCount));
  }
  
  return firestoreQuery(collectionRef, ...constraints);
}

/**
 * Batch query helper - fetches data in batches
 */
export async function getBatchedData<T>(
  collectionRef: CollectionReference<T>,
  constraints: QueryConstraint[] = [],
  batchSize: number = 100
): Promise<T[]> {
  let allData: T[] = [];
  let lastDoc: DocumentSnapshot | null = null;
  let hasMore = true;
  
  while (hasMore) {
    let q: Query<T> = firestoreQuery(collectionRef, ...constraints);
    
    if (lastDoc) {
      q = firestoreQuery(q, startAfter(lastDoc), limit(batchSize));
    } else {
      q = firestoreQuery(q, limit(batchSize));
    }
    
    const snapshot = await getDocs(q);
    const docs = snapshot.docs;
    
    allData = allData.concat(docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[]);
    
    hasMore = docs.length === batchSize;
    lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
  }
  
  return allData;
}

/**
 * Check if query needs composite index
 * Returns helpful error message if index is missing
 */
export function handleIndexError(error: any): string {
  if (error?.code === 'failed-precondition' && error?.message?.includes('index')) {
    const match = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
    if (match) {
      return `Missing Firestore index. Create it here: ${match[0]}`;
    }
    return 'Missing Firestore composite index. Check Firebase Console for index creation link.';
  }
  return error?.message || 'Query failed';
}



