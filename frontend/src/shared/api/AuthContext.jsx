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

    const email = userObj.email;
    const metadata = userObj.user_metadata || {};
    const nameFromGoogle = metadata.full_name || metadata.name || email.split('@')[0];

    try {
      // 1. Try to get the profile with company name joined
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*, companies(name, logo_url, logo)')
        .eq('id', userObj.id)
        .single();
        
      console.log('DEBUG: Raw profile from DB:', profile);
      if (error) console.error('DEBUG: Profile fetch error:', error);
      if (error && error.code === 'PGRST116') {
        console.log('Profile not found, checking for pending invitations for:', email);
        
        // Check for pending invitation
        const { data: invitation, error: inviteError } = await supabase
          .from('pending_users')
          .select('*')
          .eq('email', email)
          .single();
          
        let initialRole = email === 'qallakiibrahim@gmail.com' ? 'superadmin' : 'user';
        let initialCompanyId = null;
        
        if (!inviteError && invitation) {
          console.log('Found pending invitation:', invitation);
          initialRole = invitation.role || 'user';
          initialCompanyId = invitation.company_id;
        }

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ 
            id: userObj.id, 
            email: email,
            display_name: nameFromGoogle,
            username: nameFromGoogle,
            role: initialRole,
            company_id: initialCompanyId,
            permissions: ['read_write']
          }])
          .select('*, companies(name, logo_url)')
          .single();
          
        if (createError) {
          console.error('Error creating profile:', createError);
          // Fallback to a mock profile so UI doesn't hang
          profile = { 
            id: userObj.id, 
            email: email, 
            display_name: nameFromGoogle,
            username: nameFromGoogle,
            role: initialRole,
            company_id: initialCompanyId,
            permissions: ['read_write']
          };
        } else {
          profile = newProfile;
          
          // Delete the invitation if it was used
          if (invitation) {
            await supabase.from('pending_users').delete().eq('id', invitation.id);
          }
        }
      } else if (error) {
        console.error('Error fetching user profile:', error);
        profile = { 
          id: userObj.id, 
          email: email, 
          display_name: nameFromGoogle,
          username: nameFromGoogle,
          role: email === 'qallakiibrahim@gmail.com' ? 'superadmin' : 'user',
          permissions: ['read_write']
        };
      }

      // Ensure we have at least a basic profile object
      if (!profile) {
        profile = { 
          id: userObj.id, 
          email: email, 
          display_name: nameFromGoogle,
          username: nameFromGoogle,
          role: email === 'qallakiibrahim@gmail.com' ? 'superadmin' : 'user',
          permissions: ['read_write']
        };
      } else if (!profile.permissions) {
        profile.permissions = ['read_write'];
      }

      // Flatten company data for easier access
      if (profile.companies) {
        const companyData = Array.isArray(profile.companies) ? profile.companies[0] : profile.companies;
        if (companyData) {
          profile.company_name = companyData.name;
          profile.company_logo = companyData.logo_url || companyData.logo;
          console.log('DEBUG: Company data found via join:', companyData);
        }
      } else if (profile.company_id) {
        console.log('DEBUG: No company join found, but company_id exists:', profile.company_id);
        // Fallback: Fetch company directly
        const { data: directCompany, error: directError } = await supabase
          .from('companies')
          .select('name, logo_url, logo')
          .eq('id', profile.company_id)
          .single();
          
        if (!directError && directCompany) {
          profile.company_name = directCompany.name;
          profile.company_logo = directCompany.logo_url || directCompany.logo;
          console.log('DEBUG: Company data found via direct fetch:', directCompany);
        } else {
          console.error('DEBUG: Direct company fetch failed:', directError);
        }
      } else {
        console.log('DEBUG: No company_id on profile:', profile);
      }
      
      console.log('DEBUG: Final company_logo:', profile.company_logo);

      // Set the profile immediately so UI can render
      setUserProfile(profile);

      // 3. Background updates (don't block the main flow)
      (async () => {
        try {
          let updates = {};
          let needsUpdate = false;

          // Auto-promote system owner
          if (email === 'qallakiibrahim@gmail.com' && profile.role !== 'superadmin') {
            updates.role = 'superadmin';
            needsUpdate = true;
          }

          // Link to SafeQMS for superadmin if not already linked
          if (email === 'qallakiibrahim@gmail.com' && !profile.company_id) {
            console.log('Superadmin has no company, linking to SafeQMS...');
            // First, find or create the SafeQMS company
            let safeQmsId = null;
            const { data: companies, error: compError } = await supabase.from('companies').select('id, name').eq('name', 'SafeQMS');
            
            if (compError) {
              console.error('Error finding SafeQMS company:', compError);
            } else if (companies && companies.length > 0) {
              safeQmsId = companies[0].id;
            } else {
              console.log('SafeQMS company not found, creating it...');
              const { data: newCompany, error: createCompError } = await supabase.from('companies').insert([{ 
                name: 'SafeQMS', 
                org_nr: '555555-5555', 
                plan: 'Premium', 
                status: 'active' 
              }]).select().single();
              
              if (createCompError) {
                console.error('Error creating SafeQMS company:', createCompError);
              } else {
                safeQmsId = newCompany?.id;
              }
            }

            if (safeQmsId) {
              updates.company_id = safeQmsId;
              needsUpdate = true;
              
              // Optimistically update the local profile state
              setUserProfile(prev => ({ ...prev, company_id: safeQmsId, company_name: 'SafeQMS' }));
            }
          }

          // Update display name if missing
          if (!profile.display_name && nameFromGoogle) {
            updates.display_name = nameFromGoogle;
            updates.username = nameFromGoogle;
            needsUpdate = true;
          }

          if (needsUpdate) {
            const { data: updatedProfile, error: updateErr } = await supabase
              .from('profiles')
              .update(updates)
              .eq('id', userObj.id)
              .select('*, companies(name, logo_url, logo)')
              .single();
            
            if (updateErr) {
              console.error('Error updating profile in background:', updateErr);
            } else if (updatedProfile) {
              if (updatedProfile.companies) {
                const companyData = Array.isArray(updatedProfile.companies) ? updatedProfile.companies[0] : updatedProfile.companies;
                if (companyData) {
                  updatedProfile.company_name = companyData.name;
                  updatedProfile.company_logo = companyData.logo_url || companyData.logo;
                }
              }
              setUserProfile(updatedProfile);
            }
          }
        } catch (bgErr) {
          console.warn('Background profile update failed:', bgErr);
        }
      })();

    } catch (err) {
      console.error('Unexpected error in fetchUserProfile:', err);
      setUserProfile({ 
        id: userObj.id, 
        email: email, 
        display_name: nameFromGoogle,
        username: nameFromGoogle,
        role: email === 'qallakiibrahim@gmail.com' ? 'superadmin' : 'user',
        permissions: ['read_write']
      });
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

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, currentUser: user, userProfile, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
