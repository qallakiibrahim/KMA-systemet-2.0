import { supabase } from '../../../supabase';
import { logAction } from '../../../shared/api/auditLog';

const tableName = 'companies';

export const getCompanies = async (page = 1, pageSize = 50) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to);
    
  if (error) throw error;
  return { data, count };
};

export const createCompany = async (data, user = null) => {
  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert([data])
    .select()
    .single();
    
  if (error) throw error;

  if (user) {
    logAction({
      action: 'CREATE',
      entity_type: 'COMPANY',
      entity_id: inserted.id,
      entity_name: inserted.name,
      user_id: user.id,
      user_email: user.email,
      company_id: inserted.id
    });
  }

  return inserted;
};

export const updateCompany = async (id, data, user = null) => {
  let oldData = null;
  if (user) {
    const { data: existing } = await supabase.from(tableName).select('*').eq('id', id).single();
    oldData = existing;
  }

  const { data: updated, error } = await supabase
    .from(tableName)
    .update(data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;

  if (user) {
    logAction({
      action: 'UPDATE',
      entity_type: 'COMPANY',
      entity_id: id,
      entity_name: updated.name,
      changes: { old: oldData, new: updated },
      user_id: user.id,
      user_email: user.email,
      company_id: id
    });
  }

  return updated;
};

export const deleteCompany = async (id, user = null) => {
  let entityName = id;
  if (user) {
    const { data } = await supabase.from(tableName).select('name').eq('id', id).single();
    if (data) entityName = data.name;
  }

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);
    
  if (error) throw error;

  if (user) {
    logAction({
      action: 'DELETE',
      entity_type: 'COMPANY',
      entity_id: id,
      entity_name: entityName,
      user_id: user.id,
      user_email: user.email,
      company_id: id
    });
  }

  return { id };
};
