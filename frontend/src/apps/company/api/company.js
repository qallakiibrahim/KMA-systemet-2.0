import { supabase } from '../../../supabase';

const tableName = 'companies';

export const getCompanies = async () => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('name', { ascending: true });
    
  if (error) throw error;
  return data;
};

export const createCompany = async (data) => {
  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert([data])
    .select()
    .single();
    
  if (error) throw error;
  return inserted;
};

export const updateCompany = async (id, data) => {
  console.log('DEBUG: Updating company with data:', data);
  const { data: updated, error } = await supabase
    .from(tableName)
    .update(data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('DEBUG: Update company error:', error);
    throw error;
  }
  console.log('DEBUG: Updated company result:', updated);
  return updated;
};

export const deleteCompany = async (id) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return { id };
};
