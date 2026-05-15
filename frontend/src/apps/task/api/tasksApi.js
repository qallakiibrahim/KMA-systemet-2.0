import { db } from '../../../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { logAction } from '../../../shared/api/auditLog';
import { handleFirestoreError, OperationType, sanitizeFirestoreData } from '../../../shared/utils/firestoreError';

const collectionName = 'tasks';

export const getTasks = async (companyId, page = 1, pageSize = 20) => {
  if (!companyId) return pageSize === -1 ? [] : { data: [], count: 0 };
  try {
    const collRef = collection(db, collectionName);
    let q = query(collRef, where('company_id', '==', companyId), orderBy('created_at', 'desc'));

    if (pageSize > 0 && page > 0) {
      q = query(q, limit(page * pageSize));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Total count for current company
    const countQuery = query(collRef, where('company_id', '==', companyId));
    const totalCountSnap = await getDocs(countQuery);
    const totalCount = totalCountSnap.size;
    
    return pageSize === -1 ? data : { data: data.slice((page - 1) * pageSize, page * pageSize), count: totalCount };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const getOpenTasks = async (companyId) => {
  if (!companyId) return [];
  try {
    const collRef = collection(db, collectionName);
    const q = query(collRef, where('company_id', '==', companyId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    return data.filter(t => t.status !== 'done' && t.status !== 'closed' && t.due_date);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const createTask = async (data, user = null) => {
  try {
    const sanitizedData = sanitizeFirestoreData(data);
    const docRef = await addDoc(collection(db, collectionName), {
      ...sanitizedData,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    
    const inserted = { id: docRef.id, ...data };
    
    if (user) {
      logAction({
        action: 'CREATE',
        entity_type: 'TASK',
        entity_id: docRef.id,
        entity_name: inserted.title,
        user_id: user.uid,
        user_email: user.email,
        company_id: inserted.company_id
      });
    }

    return inserted;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionName);
  }
};

export const updateTask = async (id, data, user = null) => {
  try {
    const sanitizedData = sanitizeFirestoreData(data);
    const docRef = doc(db, collectionName, id);

    let oldData = null;
    if (user) {
      const snap = await getDoc(docRef);
      oldData = snap.data();
    }

    await updateDoc(docRef, {
      ...sanitizedData,
      updated_at: serverTimestamp()
    });
    
    const updated = { id, ...data };

    if (user) {
      logAction({
        action: 'UPDATE',
        entity_type: 'TASK',
        entity_id: id,
        entity_name: updated.title,
        changes: { old: oldData, new: updated },
        user_id: user.uid,
        user_email: user.email,
        company_id: updated.company_id
      });
    }

    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
  }
};

export const deleteTask = async (id, user = null) => {
  try {
    let entityName = id;
    let companyId = null;
    const docRef = doc(db, collectionName, id);

    if (user) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        entityName = data.title;
        companyId = data.company_id;
      }
    }

    await deleteDoc(docRef);
      
    if (user) {
      logAction({
        action: 'DELETE',
        entity_type: 'TASK',
        entity_id: id,
        entity_name: entityName,
        user_id: user.uid,
        user_email: user.email,
        company_id: companyId
      });
    }

    return { id };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
  }
};
