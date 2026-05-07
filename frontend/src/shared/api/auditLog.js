import { db } from '../../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  serverTimestamp,
  where,
  getDocsFromServer
} from 'firebase/firestore';

const collectionName = 'audit_logs';

/**
 * Log an action to the audit trail
 */
export const logAction = async (actionData) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...actionData,
      timestamp: serverTimestamp(),
      created_at: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error logging action:', error);
    return null;
  }
};

/**
 * Get audit logs with pagination
 */
export const getAuditLogs = async (page = 1, pageSize = 20, filters = {}) => {
  try {
    const collRef = collection(db, collectionName);
    let q = query(collRef, orderBy('created_at', 'desc'));

    if (filters.entity_type) {
      q = query(q, where('entity_type', '==', filters.entity_type));
    }
    if (filters.entity_id) {
      q = query(q, where('entity_id', '==', filters.entity_id));
    }
    if (filters.user_id) {
      q = query(q, where('user_id', '==', filters.user_id));
    }
    if (filters.company_id) {
      q = query(q, where('company_id', '==', filters.company_id));
    }

    if (pageSize > 0 && page > 0) {
      q = query(q, limit(page * pageSize));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Manual slicing for simple page simulation
    const pagedData = data.slice((page - 1) * pageSize, page * pageSize);
    const totalCount = (await getDocs(collRef)).size;

    return { data: pagedData, count: totalCount };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

/**
 * Get recent audit logs for a specific company
 */
export const getCompanyAuditLogs = async (companyId, limitCount = 10) => {
  try {
    let q = query(
      collection(db, collectionName),
      where('company_id', '==', companyId),
      orderBy('created_at', 'desc')
    );

    if (limitCount > 0) {
      q = query(q, limit(limitCount));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching company audit logs:', error);
    return [];
  }
};
