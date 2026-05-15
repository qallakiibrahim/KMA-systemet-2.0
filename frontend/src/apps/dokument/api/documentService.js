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
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { handleFirestoreError, OperationType, sanitizeFirestoreData } from '../../../shared/utils/firestoreError';

const collectionName = 'documents';

export const getDocuments = async (companyId) => {
  try {
    const collRef = collection(db, collectionName);
    const q = query(collRef, where('company_id', '==', companyId), orderBy('updated_at', 'desc'));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Fetch attachments for each document (if they are stored in a subcollection or separate collection)
    // To mirror Supabase join, we'll fetch them from an 'attachments' collection
    const enrichedDocs = await Promise.all(docs.map(async (document) => {
      const attColl = collection(db, 'attachments');
      const attQ = query(attColl, where('document_id', '==', document.id));
      const attSnap = await getDocs(attQ);
      return {
        ...document,
        attachments: attSnap.docs.map(ad => ({ id: ad.id, ...ad.data() }))
      };
    }));

    return enrichedDocs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const getDocumentById = async (id) => {
  try {
    const docRef = doc(db, collectionName, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Document not found');
    const document = { id: snap.id, ...snap.data() };

    const attColl = collection(db, 'attachments');
    const attQ = query(attColl, where('document_id', '==', id));
    const attSnap = await getDocs(attQ);
    document.attachments = attSnap.docs.map(ad => ({ id: ad.id, ...ad.data() }));

    return document;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`);
  }
};

export const saveDocument = async (documentData) => {
  const { id, attachments, ...rest } = documentData;
  try {
    const sanitizedData = sanitizeFirestoreData(rest);
    if (id) {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, { ...sanitizedData, updated_at: serverTimestamp() });
      const snap = await getDoc(docRef);
      return { id: snap.id, ...snap.data() };
    } else {
      const docRef = await addDoc(collection(db, collectionName), {
        ...sanitizedData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      const snap = await getDoc(docRef);
      return { id: snap.id, ...snap.data() };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
};

export const deleteDocument = async (id) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
  }
};

export const uploadAttachment = async (file, documentId, userId) => {
  try {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `attachments/${documentId}/${fileName}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, file);
    const publicUrl = await getDownloadURL(storageRef);

    const docRef = await addDoc(collection(db, 'attachments'), {
      document_id: documentId,
      file_name: file.name,
      file_url: publicUrl,
      file_path: filePath, // Store path for easy deletion
      file_type: file.type,
      file_size: file.size,
      uploaded_by: userId,
      uploaded_at: serverTimestamp()
    });

    const snap = await getDoc(docRef);
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'attachments');
  }
};

export const deleteAttachment = async (id, filePath) => {
  try {
    if (filePath) {
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef).catch(err => console.warn('Storage delete failed or file missing:', err));
    }
    await deleteDoc(doc(db, 'attachments', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `attachments/${id}`);
  }
};
