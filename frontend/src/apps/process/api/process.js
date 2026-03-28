import { supabase } from '../../../supabase';

const tableName = 'processes';

export const getProcesses = async () => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
};

export const getGlobalProcesses = async () => {
  try {
    console.log('Fetching global processes from Supabase...');
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .or('is_global.eq.true,company_id.is.null');
      
    if (error) {
      console.warn('Full global processes query failed, trying fallback...', error);
      const { data: allProcs, error: allProcsError } = await supabase
        .from(tableName)
        .select('*');
        
      if (allProcsError) throw allProcsError;
      
      return allProcs.filter(p => 
        p.is_global === true || 
        !p.company_id ||
        p.is_template === true ||
        p.title?.toLowerCase().includes('mall')
      );
    }
    
    console.log(`Fetched ${data?.length || 0} global processes`);
    return data.filter(p => p.is_global === true || !p.company_id || p.is_template === true || p.title?.toLowerCase().includes('mall'));
  } catch (error) {
    console.error('Error fetching global processes:', error);
    return [];
  }
};

export const createProcess = async (data) => {
  // Defensive: try to insert, if it fails due to missing columns, try a minimal version
  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert([data])
    .select()
    .single();
    
  if (error) {
    console.error('Supabase createProcess error:', error);
    
    // If it's a missing column error, try without SaaS columns
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.warn('Retrying process creation without SaaS columns...');
      const { company_id, is_template, is_global, category, ...minimalData } = data;
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

export const updateProcess = async (id, data) => {
  const { data: updated, error } = await supabase
    .from(tableName)
    .update(data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Supabase updateProcess error:', error);
    throw error;
  }
  return updated;
};

export const getProcessById = async (id) => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteProcess = async (id) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return { id };
};
