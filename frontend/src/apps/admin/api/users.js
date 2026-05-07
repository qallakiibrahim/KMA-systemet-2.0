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

const collectionName = 'profiles';

export const getUsers = async (page = 1, pageSize = 50) => {
  try {
    const collRef = collection(db, collectionName);
    let q = query(collRef, orderBy('display_name', 'asc'));
    
    if (pageSize > 0 && page > 0) {
      q = query(q, limit(page * pageSize));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Fetch company names
    const enrichedData = await Promise.all(data.map(async (u) => {
      if (u.company_id) {
        const cSnap = await getDoc(doc(db, 'companies', u.company_id));
        if (cSnap.exists()) {
          return { ...u, company_name: cSnap.data().name };
        }
      }
      return u;
    }));

    const pagedData = enrichedData.slice((page - 1) * pageSize, page * pageSize);
    const totalCount = (await getDocs(collRef)).size;

    return { data: pagedData, count: totalCount };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const updateUserRole = async (userId, role, adminUser = null) => {
  try {
    const docRef = doc(db, collectionName, userId);
    let oldData = null;
    if (adminUser) {
      const snap = await getDoc(docRef);
      oldData = snap.data();
    }

    await updateDoc(docRef, { role, updated_at: serverTimestamp() });
    
    const freshSnap = await getDoc(docRef);
    const data = { id: freshSnap.id, ...freshSnap.data() };

    if (adminUser) {
      logAction({
        action: 'UPDATE',
        entity_type: 'USER_ROLE',
        entity_id: userId,
        entity_name: data.display_name || data.email || userId,
        changes: { old: oldData, new: data },
        user_id: adminUser.uid,
        user_email: adminUser.email,
        company_id: data.company_id
      });
    }

    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${userId}`);
  }
};

export const updateUser = async (userId, updates, adminUser = null) => {
  try {
    const docRef = doc(db, collectionName, userId);
    let oldData = null;
    if (adminUser) {
      const snap = await getDoc(docRef);
      oldData = snap.data();
    }

    await updateDoc(docRef, { ...updates, updated_at: serverTimestamp() });
    
    const freshSnap = await getDoc(docRef);
    const data = { id: freshSnap.id, ...freshSnap.data() };

    if (adminUser) {
      logAction({
        action: 'UPDATE',
        entity_type: 'USER_PROFILE',
        entity_id: userId,
        entity_name: data.display_name || data.email || userId,
        changes: { old: oldData, new: data },
        user_id: adminUser.uid,
        user_email: adminUser.email,
        company_id: data.company_id
      });
    }

    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${userId}`);
  }
};

// --- Invitation APIs ---

export const getPendingInvitations = async () => {
  try {
    const collRef = collection(db, 'pending_users');
    const q = query(collRef, orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Enrich with company names
    const enriched = await Promise.all(data.map(async (inv) => {
      if (inv.company_id) {
        const cSnap = await getDoc(doc(db, 'companies', inv.company_id));
        if (cSnap.exists()) {
          return { ...inv, company_name: cSnap.data().name };
        }
      }
      return inv;
    }));

    return enriched;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'pending_users');
  }
};

export const inviteUser = async (inviteData, adminUser = null) => {
  try {
    const docRef = await addDoc(collection(db, 'pending_users'), {
      ...inviteData,
      created_at: serverTimestamp()
    });
    
    const data = { id: docRef.id, ...inviteData };

    if (adminUser) {
      logAction({
        action: 'CREATE',
        entity_type: 'INVITATION',
        entity_id: docRef.id,
        entity_name: data.email,
        changes: { new: data },
        user_id: adminUser.uid,
        user_email: adminUser.email,
        company_id: data.company_id
      });
    }

    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'pending_users');
  }
};

export const deleteInvitation = async (inviteId, adminUser = null) => {
  try {
    let entityName = inviteId;
    let companyId = null;
    const docRef = doc(db, 'pending_users', inviteId);

    if (adminUser) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        entityName = data.email;
        companyId = data.company_id;
      }
    }

    await deleteDoc(docRef);
      
    if (adminUser) {
      logAction({
        action: 'DELETE',
        entity_type: 'INVITATION',
        entity_id: inviteId,
        entity_name: entityName,
        user_id: adminUser.uid,
        user_email: adminUser.email,
        company_id: companyId
      });
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `pending_users/${inviteId}`);
  }
};
