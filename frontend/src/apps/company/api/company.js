import { db } from '../../../firebase';
import { 
  collection, 
  query, 
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

const collectionName = 'companies';

export const getCompanies = async (page = 1, pageSize = 50) => {
  try {
    const collRef = collection(db, collectionName);
    let q = query(collRef, orderBy('name', 'asc'));

    if (pageSize > 0 && page > 0) {
      q = query(q, limit(page * pageSize));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const pagedData = data.slice((page - 1) * pageSize, page * pageSize);
    const totalCount = (await getDocs(collRef)).size;

    return { data: pagedData, count: totalCount };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const createCompany = async (data, user = null) => {
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
        entity_type: 'COMPANY',
        entity_id: docRef.id,
        entity_name: inserted.name,
        changes: { new: inserted },
        user_id: user.uid,
        user_email: user.email,
        company_id: docRef.id
      });
    }

    return inserted;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionName);
  }
};

export const updateCompany = async (id, data, user = null) => {
  try {
    const docRef = doc(db, collectionName, id);
    let oldData = null;
    if (user) {
      const snap = await getDoc(docRef);
      oldData = snap.data();
    }

    await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
    
    const freshSnap = await getDoc(docRef);
    const updated = { id: freshSnap.id, ...freshSnap.data() };

    if (user) {
      logAction({
        action: 'UPDATE',
        entity_type: 'COMPANY',
        entity_id: id,
        entity_name: updated.name,
        changes: { old: oldData, new: updated },
        user_id: user.uid,
        user_email: user.email,
        company_id: id
      });
    }

    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
  }
};

export const deleteCompany = async (id, user = null) => {
  try {
    let entityName = id;
    const docRef = doc(db, collectionName, id);

    if (user) {
      const snap = await getDoc(docRef);
      if (snap.exists()) entityName = snap.data().name;
    }

    await deleteDoc(docRef);
      
    if (user) {
      logAction({
        action: 'DELETE',
        entity_type: 'COMPANY',
        entity_id: id,
        entity_name: entityName,
        user_id: user.uid,
        user_email: user.email,
        company_id: id
      });
    }

    return { id };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
  }
};
