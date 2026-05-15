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

const collectionName = 'avvikelser';

export const compressImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, file.type, quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const uploadAttachment = async (file) => {
  try {
    const compressedFile = await compressImage(file);
    const timestamp = Date.now();
    const safeName = compressedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filePath = `avvikelser/${timestamp}_${safeName}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, compressedFile);
    const publicUrl = await getDownloadURL(storageRef);

    return {
      name: compressedFile.name,
      url: publicUrl,
      type: compressedFile.type,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};

export const getAvvikelser = async (companyId, page = 1, pageSize = 20) => {
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

export const getOpenAvvikelser = async (companyId) => {
  if (!companyId) return [];
  try {
    const collRef = collection(db, collectionName);
    const q = query(collRef, where('company_id', '==', companyId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return data.filter(r => r.status !== 'closed' && r.deadline);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const createAvvikelse = async (data, user = null) => {
  try {
    const sanitizedData = sanitizeFirestoreData(data);
    const docRef = await addDoc(collection(db, collectionName), {
      ...sanitizedData,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    
    const inserted = { id: docRef.id, ...sanitizedData };
    
    if (user) {
      logAction({
        action: 'CREATE',
        entity_type: 'ISSUE',
        entity_id: docRef.id,
        entity_name: inserted.titel || inserted.title,
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

export const updateAvvikelse = async (id, data, user = null) => {
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
    
    const updated = { id, ...sanitizedData };

    if (user) {
      logAction({
        action: 'UPDATE',
        entity_type: 'ISSUE',
        entity_id: id,
        entity_name: updated.titel || updated.title,
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

export const deleteAvvikelse = async (id, user = null) => {
  try {
    let entityName = id;
    let companyId = null;
    const docRef = doc(db, collectionName, id);

    if (user) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        entityName = data.titel || data.title;
        companyId = data.company_id;
      }
    }

    await deleteDoc(docRef);
      
    if (user) {
      logAction({
        action: 'DELETE',
        entity_type: 'ISSUE',
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
