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
import { handleFirestoreError, OperationType } from '../../../shared/utils/firestoreError';

const collectionName = 'tasks';

export const getTasks = async (page = 1, pageSize = 20) => {
  try {
    const collRef = collection(db, collectionName);
    let q = query(collRef, orderBy('created_at', 'desc'));

    if (pageSize !== -1) {
      q = query(q, limit(page * pageSize));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Manual slicing for simple page simulation
    const pagedData = pageSize === -1 ? data : data.slice((page - 1) * pageSize, page * pageSize);
    const totalCount = (await getDocs(collRef)).size;
    
    return pageSize === -1 ? data : { data: pagedData, count: totalCount };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const getOpenTasks = async () => {
  try {
    const collRef = collection(db, collectionName);
    // Firestore doesn't support 'not in' with multiple values easily without custom queries
    // We'll fetch and filter if necessary, or use composite queries if permitted.
    // For now, let's fetch all and filter in JS to avoid complex index requirements.
    const snapshot = await getDocs(collRef);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    return data.filter(t => t.status !== 'done' && t.status !== 'closed' && t.due_date);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const createTask = async (data, user = null) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
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
    const docRef = doc(db, collectionName, id);

    let oldData = null;
    if (user) {
      const snap = await getDoc(docRef);
      oldData = snap.data();
    }

    await updateDoc(docRef, {
      ...data,
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
