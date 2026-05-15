import { db, auth } from '../../../firebase';
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
  limit,
  startAfter,
  getDocsFromServer
} from 'firebase/firestore';
import { logAction } from '../../../shared/api/auditLog';
import { handleFirestoreError, OperationType, sanitizeFirestoreData } from '../../../shared/utils/firestoreError';

const collectionName = 'processes';

export const getProcesses = async (companyId, page = 1, pageSize = 20, isSuperAdmin = false) => {
  try {
    console.log(`Fetching processes. Company: ${companyId}, Page: ${page}, Super: ${isSuperAdmin}`);
    const collRef = collection(db, collectionName);
    let q;
    let countQuery;
    
    if (companyId) {
      q = query(collRef, where('company_id', '==', companyId), orderBy('created_at', 'desc'));
      countQuery = query(collRef, where('company_id', '==', companyId));
    } else if (isSuperAdmin) {
      // Superadmins without company see global/template processes
      q = query(collRef, where('is_global', '==', true), orderBy('created_at', 'desc'));
      countQuery = query(collRef, where('is_global', '==', true));
    } else {
      return pageSize === -1 ? [] : { data: [], count: 0 };
    }

    if (pageSize > 0 && page > 0) {
      q = query(q, limit(page * pageSize));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Total count for current filter
    const totalCountSnap = await getDocs(countQuery);
    const totalCount = totalCountSnap.size;
    
    const pagedData = pageSize === -1 ? data : data.slice((page - 1) * pageSize, page * pageSize);
    
    return pageSize === -1 ? data : { data: pagedData, count: totalCount };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const getGlobalProcesses = async () => {
  try {
    console.log('Fetching global processes from Firestore...');
    const collRef = collection(db, collectionName);
    
    // Firestore doesn't support OR across different fields easily in 1 query without composite indexes or multiple queries
    // We'll fetch global ones
    const qGlobal = query(collRef, where('is_global', '==', true));
    const globalSnap = await getDocs(qGlobal);
    
    // And null company_id ones (represented as non-existent or empty string in Firestore usually)
    // Actually, following the blueprint, they should have company_id.
    // Let's just fetch template-like and global ones
    const allGlobal = globalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    return allGlobal.filter(p => p.is_global === true || !p.company_id || p.is_template === true || p.title?.toLowerCase().includes('mall'));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const createProcess = async (data, user = null) => {
  try {
    const { attachments, ...insertData } = data;
    const sanitizedData = sanitizeFirestoreData(insertData);

    const docRef = await addDoc(collection(db, collectionName), {
      ...sanitizedData,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    
    const inserted = { id: docRef.id, ...insertData };
    
    if (user) {
      logAction({
        action: 'CREATE',
        entity_type: 'PROCESS',
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

export const updateProcess = async (id, data, user = null) => {
  try {
    const { attachments, ...updateData } = data;
    const sanitizedData = sanitizeFirestoreData(updateData);

    const docRef = doc(db, collectionName, id);

    let oldData = null;
    if (user) {
      const existing = await getDoc(docRef);
      oldData = existing.data();
    }

    await updateDoc(docRef, {
      ...sanitizedData,
      updated_at: serverTimestamp()
    });
    
    const updated = { id, ...updateData };

    if (user) {
      logAction({
        action: 'UPDATE',
        entity_type: 'PROCESS',
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

export const getProcessById = async (id) => {
  try {
    const docRef = doc(db, collectionName, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Process not found');
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`);
  }
};

export const getProcessByTitle = async (title, companyId = null) => {
  try {
    let q;
    if (companyId) {
      q = query(collection(db, collectionName), where('title', '==', title), where('company_id', '==', companyId), limit(1));
    } else {
      q = query(collection(db, collectionName), where('title', '==', title), limit(1));
    }
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionName);
  }
};

export const deleteProcess = async (id, user = null) => {
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
        entity_type: 'PROCESS',
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
