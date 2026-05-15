import { db, storage } from '../../../firebase';
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logAction } from '../../../shared/api/auditLog';
import { handleFirestoreError, OperationType, sanitizeFirestoreData } from '../../../shared/utils/firestoreError';

const collectionName = 'documents';

export const getDokuments = async (companyId, page = 1, pageSize = 20) => {
  if (!companyId) return pageSize === -1 ? [] : { data: [], count: 0 };
  try {
    const collRef = collection(db, collectionName);
    let q = query(collRef, where('company_id', '==', companyId), orderBy('created_at', 'desc'));

    if (pageSize > 0 && page > 0) {
      q = query(collRef, where('company_id', '==', companyId), orderBy('created_at', 'desc'), limit(page * pageSize));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const pagedData = pageSize === -1 ? data : data.slice((page - 1) * pageSize, page * pageSize);
    
    // Count total for this company
    const countQuery = query(collRef, where('company_id', '==', companyId));
    const totalCount = (await getDocs(countQuery)).size;
    
    return pageSize === -1 ? data : { data: pagedData, count: totalCount };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const getGlobalTemplates = async () => {
  try {
    const collRef = collection(db, collectionName);
    const q = query(collRef, where('is_global', '==', true));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return data.filter(d => d.is_global === true || !d.company_id || d.is_template === true || d.title?.toLowerCase().includes('mall'));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const getDokumentById = async (id) => {
  try {
    const docRef = doc(db, collectionName, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Document not found');
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`);
  }
};

export const createDokument = async (data, user = null) => {
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
        entity_type: 'DOCUMENT',
        entity_id: docRef.id,
        entity_name: inserted.title,
        changes: { new: inserted },
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

export const updateDokument = async (id, data, user = null) => {
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
        entity_type: 'DOCUMENT',
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

export const deleteDokument = async (id, user = null) => {
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
        entity_type: 'DOCUMENT',
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

export const uploadDocument = async (file) => {
  try {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filePath = `documents/${timestamp}_${safeName}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, file);
    const publicUrl = await getDownloadURL(storageRef);

    return {
      name: file.name,
      url: publicUrl,
      type: file.type,
      size: file.size
    };
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};
