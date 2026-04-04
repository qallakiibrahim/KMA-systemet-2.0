import { supabase } from '../../../supabase';

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

export const createTask = async (data) => {
  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert([data])
    .select()
    .single();
    
  if (error) throw error;
  return inserted;
};

export const updateTask = async (id, data) => {
  const { data: updated, error } = await supabase
    .from(tableName)
    .update(data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return updated;
};

export const deleteTask = async (id) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return { id };
};
