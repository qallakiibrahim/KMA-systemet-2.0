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

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timed out')), 8000)
    );

    try {
      await Promise.race([
        (async () => {
          // Try to get the profile
          let { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userObj.id)
            .single();
            
          // If profile doesn't exist, create it
          if (error && error.code === 'PGRST116') {
            console.log('Profile not found, creating new profile...');
            const metadata = userObj.user_metadata || {};
            const name = metadata.full_name || metadata.name || userObj.email.split('@')[0];
            
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert([{ 
                id: userObj.id, 
                email: userObj.email,
                display_name: name,
                username: name,
                role: userObj.email === 'qallakiibrahim@gmail.com' ? 'superadmin' : 'user'
              }])
              .select()
              .single();
              
            if (createError) {
              console.error('Error creating profile:', createError);
              setUserProfile({ id: userObj.id, email: userObj.email, role: 'user' });
              return;
            }
            data = newProfile;
            error = null;
          } else if (error) {
            console.error('Error fetching user profile:', error);
            setUserProfile({ id: userObj.id, email: userObj.email, role: 'user' });
            return;
          }

          let currentProfile = data;
          const metadata = userObj.user_metadata || {};
          const nameFromGoogle = metadata.full_name || metadata.name;
          const email = userObj.email;
          
          // Auto-promote system owner to superadmin and link to SafeQMS
          if (email === 'qallakiibrahim@gmail.com') {
            console.log('Promoting user to superadmin:', email);
            let updates = { role: 'superadmin' };
            let needsUpdate = currentProfile.role !== 'superadmin';
            
            // Try to ensure SafeQMS company exists in the 'companies' table
            let safeQmsId = null;
            try {
              const { data: companies, error: selectError } = await supabase.from('companies').select('id').eq('name', 'SafeQMS');
              if (selectError) {
                console.warn('Could not select from companies table, maybe it does not exist yet?', selectError);
              } else if (!companies || companies.length === 0) {
                // Try full insert first
                const { data: newCompany, error: insertError } = await supabase.from('companies').insert([{ 
                  name: 'SafeQMS', 
                  org_nr: '555555-5555', 
                  plan: 'Premium', 
                  status: 'active' 
                }]).select().single();
                
                if (insertError) {
                  console.warn('Full company insert failed, trying minimal insert...', insertError);
                  // Try minimal insert if columns are missing
                  const { data: minimalCompany, error: minimalError } = await supabase.from('companies').insert([{ 
                    name: 'SafeQMS'
                  }]).select().single();
                  
                  if (minimalError) {
                    console.error('Critical: Could not even create minimal SafeQMS company:', minimalError);
                  } else {
                    safeQmsId = minimalCompany?.id;
                  }
                } else {
                  safeQmsId = newCompany?.id;
                }
              } else {
                safeQmsId = companies[0].id;
              }
            } catch (e) {
              console.error('SafeQMS company check/creation failed:', e);
            }

            // Try to set company_id if we have it and the column exists
            if (safeQmsId && currentProfile.company_id !== safeQmsId) {
              updates.company_id = safeQmsId;
              needsUpdate = true;
            }
            
            // Always try to set 'company' text as fallback/legacy
            if (currentProfile.company !== 'SafeQMS') {
              updates.company = 'SafeQMS';
              needsUpdate = true;
            }

            if (nameFromGoogle && (!currentProfile.display_name && !currentProfile.username)) {
              updates.display_name = nameFromGoogle;
              updates.username = nameFromGoogle;
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              try {
                // First try updating everything
                const { data: updatedData, error: updateError } = await supabase
                  .from('profiles')
                  .update(updates)
                  .eq('id', userObj.id)
                  .select()
                  .single();
                
                if (updateError) {
                  console.warn('Full profile update failed, trying minimal update...', updateError);
                  // Fallback: Try updating just the role (most important)
                  const { data: retryData, error: retryError } = await supabase
                    .from('profiles')
                    .update({ role: 'superadmin' })
                    .eq('id', userObj.id)
                    .select()
                    .single();
                  
                  if (retryError) {
                    console.error('Critical: Could not even update user role to superadmin:', retryError);
                  } else if (retryData) {
                    currentProfile = retryData;
                  }
                } else if (updatedData) {
                  currentProfile = updatedData;
                }
              } catch (updateErr) {
                console.error('Exception during profile update:', updateErr);
              }
            }
          } else if (nameFromGoogle && (!currentProfile.display_name && !currentProfile.username)) {
            // Update the profile in the database for regular users
            try {
              const { data: updatedData } = await supabase
                .from('profiles')
                .update({ 
                  display_name: nameFromGoogle,
                  username: nameFromGoogle
                })
                .eq('id', userObj.id)
                .select()
                .single();
              
              if (updatedData) {
                currentProfile = updatedData;
              }
            } catch (e) {
              console.error('Failed to update regular user profile:', e);
            }
          }
          
          setUserProfile(currentProfile);
        })(),
        timeoutPromise
      ]);
    } catch (err) {
      console.error('Unexpected error fetching profile (or timeout):', err);
      // Ensure we don't hang
      setUserProfile({ id: userObj.id, email: userObj.email, role: 'user' });
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser).finally(() => setLoading(false));
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
