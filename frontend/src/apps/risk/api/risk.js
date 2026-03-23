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
    
  if (error) {
    console.error('Supabase createRisk error:', error);
    // If it's a missing column error, try without SaaS columns
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.warn('Retrying risk creation without SaaS columns...');
      const { company_id, is_template, is_global, ...minimalData } = data;
      const { data: retryInserted, error: retryError } = await supabase
        .from(tableName)
        .insert([minimalData])
        .select()
        .single();
        
      if (retryError) throw retryError;
      return retryInserted;
    }
    throw error;
  }
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
