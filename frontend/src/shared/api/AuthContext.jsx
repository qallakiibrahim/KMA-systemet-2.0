import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userObj) => {
    if (!userObj || !userObj.id) {
      setUserProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userObj.id)
        .single();
        
      if (error) {
        console.error('Error fetching user profile:', error);
      } else {
        let currentProfile = data;
        const metadata = userObj.user_metadata || {};
        const nameFromGoogle = metadata.full_name || metadata.name;
        const email = userObj.email;
        
        // Auto-promote system owner to superadmin and link to SafeQMS
        if (email === 'qallakiibrahim@gmail.com') {
          let updates = {};
          let needsUpdate = false;
          
          if (currentProfile.role !== 'superadmin') {
            updates.role = 'superadmin';
            needsUpdate = true;
          }
          
          // Ensure SafeQMS company exists and user is linked to it
          const { data: companies } = await supabase.from('companies').select('*').eq('name', 'SafeQMS');
          let safeQmsId;
          
          if (!companies || companies.length === 0) {
            const { data: newCompany } = await supabase.from('companies').insert([{ 
              name: 'SafeQMS', 
              org_nr: '555555-5555', 
              plan: 'Premium', 
              status: 'active' 
            }]).select().single();
            safeQmsId = newCompany?.id;
          } else {
            safeQmsId = companies[0].id;
          }
          
          if (currentProfile.company_id !== safeQmsId) {
            updates.company_id = safeQmsId;
            needsUpdate = true;
          }

          if (nameFromGoogle && (!currentProfile.display_name && !currentProfile.username)) {
            updates.display_name = nameFromGoogle;
            updates.username = nameFromGoogle;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            const { data: updatedData } = await supabase
              .from('profiles')
              .update(updates)
              .eq('id', userObj.id)
              .select()
              .single();
            if (updatedData) currentProfile = updatedData;
          }
        } else if (nameFromGoogle && (!currentProfile.display_name && !currentProfile.username)) {
           // Update the profile in the database for regular users
           const { data: updatedData } = await supabase
             .from('profiles')
             .update({ 
               display_name: nameFromGoogle,
               username: nameFromGoogle
             })
             .eq('id', userObj.id)
             .select()
             .single();
             
           if (updatedData) currentProfile = updatedData;
        }
        
        setUserProfile(currentProfile);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser).then(() => setLoading(false));
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Refresh session when window gains focus (e.g. after popup closes)
    const handleFocus = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          fetchUserProfile(session.user);
        }
      });
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const login = async () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      const errorMsg = 'Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.';
      console.error(errorMsg);
      alert(errorMsg);
      throw new Error(errorMsg);
    }

    // Ensure the redirect URL matches exactly what's in Supabase
    const redirectUrl = `${window.location.origin}/process`;
    console.log('Logging in with Supabase OAuth...', { provider: 'google', redirectTo: redirectUrl });

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // This gives us the URL instead of redirecting automatically
        },
      });
      
      if (error) throw error;

      if (data?.url) {
        // Open the login URL in a popup window to bypass iframe restrictions (Google 403 error)
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        window.open(
          data.url,
          'google-login',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    } catch (error) {
      console.error('Supabase OAuth error:', error);
      alert(`Inloggning misslyckades: ${error.message || 'Okänt fel'}. Kontrollera att Supabase är korrekt konfigurerat.`);
      throw error;
    }
  };

  const logout = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, currentUser: user, userProfile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
