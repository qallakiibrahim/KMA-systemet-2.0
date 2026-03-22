import { supabase } from '../../../supabase';

const tableName = 'risker';

export const getRisker = async () => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
};

export const createRisk = async (data) => {
  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert([data])
    .select()
    .single();
    
  if (error) throw error;
  return inserted;
};

export const updateRisk = async (id, data) => {
  const { data: updated, error } = await supabase
    .from(tableName)
    .update(data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return updated;
};

export const deleteRisk = async (id) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return { id };
};
