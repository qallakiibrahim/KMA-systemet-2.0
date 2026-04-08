import { supabase } from '../../../supabase';
import { logAction } from '../../../shared/api/auditLog';

const tableName = 'tasks';

export const getTasks = async (page = 1, pageSize = 20) => {
  let query = supabase
    .from(tableName)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (pageSize !== -1) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;
    
  if (error) throw error;
  return pageSize === -1 ? data : { data, count };
};

export const getOpenTasks = async () => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .not('status', 'eq', 'done')
    .not('status', 'eq', 'closed')
    .not('dueDate', 'is', null);
    
  if (error) throw error;
  return data;
};

export const createTask = async (data, user = null) => {
  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert([data])
    .select()
    .single();
    
  if (error) throw error;

  if (user) {
    logAction({
      action: 'CREATE',
      entity_type: 'TASK',
      entity_id: inserted.id,
      entity_name: inserted.title,
      user_id: user.id,
      user_email: user.email,
      company_id: inserted.company_id
    });
  }

  return inserted;
};

export const updateTask = async (id, data, user = null) => {
  // Get old data for logging changes
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
      entity_type: 'TASK',
      entity_id: id,
      entity_name: updated.title,
      changes: { old: oldData, new: updated },
      user_id: user.id,
      user_email: user.email,
      company_id: updated.company_id
    });
  }

  return updated;
};

export const deleteTask = async (id, user = null) => {
  // Get name and company_id before deleting
  let entityName = id;
  let companyId = null;
  if (user) {
    const { data } = await supabase.from(tableName).select('title, company_id').eq('id', id).single();
    if (data) {
      entityName = data.title;
      companyId = data.company_id;
    }
  }

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);
    
  if (error) throw error;

  if (user) {
    logAction({
      action: 'DELETE',
      entity_type: 'TASK',
      entity_id: id,
      entity_name: entityName,
      user_id: user.id,
      user_email: user.email,
      company_id: companyId
    });
  }

  return { id };
};
