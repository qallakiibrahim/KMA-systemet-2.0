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

const collectionName = 'risker';

export const getRisker = async (page = 1, pageSize = 20) => {
  try {
    const collRef = collection(db, collectionName);
    let q = query(collRef, orderBy('created_at', 'desc'));

    if (pageSize !== -1) {
      q = query(q, limit(page * pageSize));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const pagedData = pageSize === -1 ? data : data.slice((page - 1) * pageSize, page * pageSize);
    const totalCount = (await getDocs(collRef)).size;
    
    return pageSize === -1 ? data : { data: pagedData, count: totalCount };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const getOpenRisker = async () => {
  try {
    const collRef = collection(db, collectionName);
    const snapshot = await getDocs(collRef);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return data.filter(r => r.status !== 'closed' && r.deadline);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const getGlobalRisks = async () => {
  try {
    const collRef = collection(db, collectionName);
    const snap = await getDocs(query(collRef, where('is_global', '==', true)));
    const allGlobal = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return allGlobal.filter(r => r.is_global === true || !r.company_id || r.is_template === true || r.title?.toLowerCase().includes('mall'));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const createRisk = async (data, user = null) => {
  try {
    const { attachments, ...insertData } = data;
    const docRef = await addDoc(collection(db, collectionName), {
      ...insertData,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    
    const inserted = { id: docRef.id, ...insertData };
    
    if (user) {
      logAction({
        action: 'CREATE',
        entity_type: 'RISK',
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

export const updateRisk = async (id, data, user = null) => {
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
        entity_type: 'RISK',
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

export const deleteRisk = async (id, user = null) => {
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
        entity_type: 'RISK',
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
