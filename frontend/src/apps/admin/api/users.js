import { supabase } from '../../../supabase';

const tableName = 'profiles';

export const getUsers = async () => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*, companies(name)')
    .order('display_name', { ascending: true });
    
  if (error) throw error;
  return data;
};

export const updateUserRole = async (userId, role) => {
  const { data, error } = await supabase
    .from(tableName)
    .update({ role })
    .eq('id', userId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateUser = async (userId, updates) => {
  const { data, error } = await supabase
    .from(tableName)
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// --- Invitation APIs ---

// Fetch all pending invitations
export const getPendingInvitations = async () => {
  const { data, error } = await supabase
    .from('pending_users')
    .select('*, companies(name)')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

// Create a new invitation
export const inviteUser = async (inviteData) => {
  const { data, error } = await supabase
    .from('pending_users')
    .insert([inviteData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Delete an invitation
export const deleteInvitation = async (inviteId) => {
  const { error } = await supabase
    .from('pending_users')
    .delete()
    .eq('id', inviteId);
  
  if (error) throw error;
  return true;
};
