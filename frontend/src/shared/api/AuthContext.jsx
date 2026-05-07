import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  collection, 
  where, 
  getDocs,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import { logAction } from './auditLog';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userObj) => {
    if (!userObj || !userObj.uid) {
      setUserProfile(null);
      return;
    }

    const email = userObj.email;
    const nameFromGoogle = userObj.displayName || email.split('@')[0];

    try {
      // 1. Try to get the profile
      const profileRef = doc(db, 'profiles', userObj.uid);
      const profileSnap = await getDoc(profileRef);
      
      let profile = null;
      
      if (!profileSnap.exists()) {
        // Check for pending invitation
        const invitesRef = collection(db, 'pending_users');
        const qInvite = query(invitesRef, where('email', '==', email));
        const inviteSnaps = await getDocs(qInvite);
        
        let initialRole = email === 'qallakiibrahim@gmail.com' ? 'superadmin' : 'user';
        let initialCompanyId = null;
        let invitation = null;
        
        if (!inviteSnaps.empty) {
          invitation = { id: inviteSnaps.docs[0].id, ...inviteSnaps.docs[0].data() };
          initialRole = invitation.role || 'user';
          initialCompanyId = invitation.company_id;
        }

        profile = { 
          id: userObj.uid, 
          email: email,
          display_name: nameFromGoogle,
          username: nameFromGoogle,
          role: initialRole,
          company_id: initialCompanyId,
          permissions: ['read_write'],
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        };

        await setDoc(profileRef, profile);
          
        // Delete the invitation if it was used
        if (invitation) {
          await deleteDoc(doc(db, 'pending_users', invitation.id));
        }
      } else {
        profile = profileSnap.data();
      }

      // Ensure we have at least a basic profile object
      if (!profile) {
        profile = { 
          id: userObj.uid, 
          email: email, 
          display_name: nameFromGoogle,
          username: nameFromGoogle,
          role: email === 'qallakiibrahim@gmail.com' ? 'superadmin' : 'user',
          permissions: ['read_write']
        };
      } else if (!profile.permissions) {
        profile.permissions = ['read_write'];
      }

      // Fetch company data
      if (profile.company_id) {
        const companySnap = await getDoc(doc(db, 'companies', profile.company_id));
        if (companySnap.exists()) {
          const companyData = companySnap.data();
          profile.company_name = companyData.name || null;
          profile.company_logo = companyData.logo_url || null;
        }
      }

      // Set the profile immediately so UI can render
      setUserProfile(profile);

      // Background updates (System Owner promotion, SafeQMS linking)
      (async () => {
        try {
          let updates = {};
          let needsUpdate = false;

          if (email === 'qallakiibrahim@gmail.com' && profile.role !== 'superadmin') {
            updates.role = 'superadmin';
            needsUpdate = true;
          }

          if (email === 'qallakiibrahim@gmail.com' && !profile.company_id) {
            const companiesRef = collection(db, 'companies');
            const qSafeQms = query(companiesRef, where('name', '==', 'SafeQMS'));
            const safeSnaps = await getDocs(qSafeQms);
            
            let safeQmsId = null;
            if (!safeSnaps.empty) {
              safeQmsId = safeSnaps.docs[0].id;
            } else {
              const newCompRef = doc(collection(db, 'companies'));
              safeQmsId = newCompRef.id;
              await setDoc(newCompRef, {
                name: 'SafeQMS',
                org_nr: '555555-5555',
                plan: 'Premium',
                status: 'active',
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
              });
            }

            if (safeQmsId) {
              updates.company_id = safeQmsId;
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            await updateDoc(profileRef, {
              ...updates,
              updated_at: serverTimestamp()
            });
            // Refresh local state if updated
            const updatedSnap = await getDoc(profileRef);
            if (updatedSnap.exists()) {
              const freshProfile = updatedSnap.data();
              if (freshProfile.company_id) {
                const cSnap = await getDoc(doc(db, 'companies', freshProfile.company_id));
                if (cSnap.exists()) {
                  freshProfile.company_name = cSnap.data().name;
                  freshProfile.company_logo = cSnap.data().logo_url;
                }
              }
              setUserProfile(freshProfile);
            }
          }
        } catch (bgErr) {
          console.warn('Background profile update failed:', bgErr);
        }
      })();

    } catch (err) {
      console.error('Unexpected error in fetchUserProfile:', err);
      setUserProfile({ 
        id: userObj.uid, 
        email: email, 
        display_name: nameFromGoogle,
        username: nameFromGoogle,
        role: email === 'qallakiibrahim@gmail.com' ? 'superadmin' : 'user',
        permissions: ['read_write']
      });
    }
  };

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('Auth state changed:', currentUser ? 'User found' : 'No user');
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser).finally(() => setLoading(false));
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      await fetchUserProfile(result.user);
      return result.user;
    } catch (error) {
      console.error('Firebase Auth error:', error);
      toast.error(`Inloggning misslyckades: ${error.message || 'Okänt fel'}`);
      throw error;
    }
  };

  const logout = () => signOut(auth);

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const oldSnap = await getDoc(profileRef);
      const oldData = oldSnap.data() || {};

      await updateDoc(profileRef, {
        ...updates,
        updated_at: serverTimestamp()
      });

      const newDataSnap = await getDoc(profileRef);
      const newData = newDataSnap.data();

      logAction({
        action: 'UPDATE',
        entity_type: 'USER_PROFILE',
        entity_id: user.uid,
        entity_name: newData.display_name || newData.username || user.email,
        changes: { old: oldData, new: newData },
        user_id: user.uid,
        user_email: user.email,
        company_id: newData.company_id
      });

      await refreshProfile();
      return newData;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, currentUser: user, userProfile, loading, login, logout, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
;
