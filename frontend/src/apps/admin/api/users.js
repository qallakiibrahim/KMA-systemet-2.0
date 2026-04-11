import { supabase } from '../../../supabase';
import { logAction } from '../../../shared/api/auditLog';

const tableName = 'profiles';

export const getUsers = async () => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*, companies(name)')
    .order('display_name', { ascending: true });
    
  if (error) throw error;
  return data;
};

export const updateUserRole = async (userId, role, adminUser = null) => {
  let oldData = null;
  if (adminUser) {
    const { data: existing } = await supabase.from(tableName).select('*').eq('id', userId).single();
    oldData = existing;
  }

  const { data, error } = await supabase
    .from(tableName)
    .update({ role })
    .eq('id', userId)
    .select()
    .single();
    
  if (error) throw error;

  if (adminUser) {
    logAction({
      action: 'UPDATE',
      entity_type: 'USER_ROLE',
      entity_id: userId,
      entity_name: data.display_name || data.email || userId,
      changes: { old: oldData, new: data },
      user_id: adminUser.id,
      user_email: adminUser.email,
      company_id: data.company_id
    });
  }

  return data;
};

export const updateUser = async (userId, updates, adminUser = null) => {
  let oldData = null;
  if (adminUser) {
    const { data: existing } = await supabase.from(tableName).select('*').eq('id', userId).single();
    oldData = existing;
  }

  const { data, error } = await supabase
    .from(tableName)
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
    
  if (error) throw error;

  if (adminUser) {
    logAction({
      action: 'UPDATE',
      entity_type: 'USER_PROFILE',
      entity_id: userId,
      entity_name: data.display_name || data.email || userId,
      changes: { old: oldData, new: data },
      user_id: adminUser.id,
      user_email: adminUser.email,
      company_id: data.company_id
    });
  }

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
export const inviteUser = async (inviteData, adminUser = null) => {
  const { data, error } = await supabase
    .from('pending_users')
    .insert([inviteData])
    .select()
    .single();
  
  if (error) throw error;

  if (adminUser) {
    logAction({
      action: 'CREATE',
      entity_type: 'INVITATION',
      entity_id: data.id,
      entity_name: data.email,
      user_id: adminUser.id,
      user_email: adminUser.email,
      company_id: data.company_id
    });
  }

  return data;
};

// Delete an invitation
export const deleteInvitation = async (inviteId, adminUser = null) => {
  let entityName = inviteId;
  let companyId = null;
  if (adminUser) {
    const { data } = await supabase.from('pending_users').select('email, company_id').eq('id', inviteId).single();
    if (data) {
      entityName = data.email;
      companyId = data.company_id;
    }
  }

  const { error } = await supabase
    .from('pending_users')
    .delete()
    .eq('id', inviteId);
  
  if (error) throw error;

  if (adminUser) {
    logAction({
      action: 'DELETE',
      entity_type: 'INVITATION',
      entity_id: inviteId,
      entity_name: entityName,
      user_id: adminUser.id,
      user_email: adminUser.email,
      company_id: companyId
    });
  }

  return true;
};
