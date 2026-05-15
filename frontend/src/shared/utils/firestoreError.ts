import { auth } from '../../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Sanitize data for Firestore by converting undefined values to null recursively.
 */
export function sanitizeFirestoreData(data: any): any {
  if (data === null || typeof data !== 'object') return data;
  
  // Handlers for Firestore special types (if any were passed as objects by mistake)
  // But generally we just care about plain objects/arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFirestoreData(item));
  }

  const sanitized: any = {};
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value === undefined) {
      sanitized[key] = null;
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      // Don't recurse into non-plain objects like Dates if they exist
      sanitized[key] = sanitizeFirestoreData(value);
    } else {
      sanitized[key] = value;
    }
  });
  return sanitized;
}
