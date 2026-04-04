import { supabase } from '../../../supabase';

const tableName = 'risker';

export const getRisker = async (page = 1, pageSize = 20) => {
  console.log('getRisker called with:', { page, pageSize });
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
    
  if (error) {
    console.error('getRisker error:', error);
    throw error;
  }
  
  console.log('getRisker result:', { count, dataLength: data?.length });
  return pageSize === -1 ? data : { data, count };
};

export const getGlobalRisks = async () => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .or('is_global.eq.true,company_id.is.null');
      
    if (error) {
      console.warn('Full global risks query failed, trying fallback...', error);
      const { data: allRisks, error: allRisksError } = await supabase
        .from(tableName)
        .select('*');
        
      if (allRisksError) throw allRisksError;
      
      return allRisks.filter(r => 
        r.is_global === true || 
        !r.company_id ||
        r.is_template === true ||
        r.title?.toLowerCase().includes('mall')
      );
    }
    return data;
  } catch (error) {
    console.error('Error fetching global risks:', error);
    return [];
  }
};

export const createRisk = async (data) => {
  // Strip out attachments if they are present (they are a relationship, not a column)
  const { attachments, ...insertData } = data;
  
  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert([insertData])
    .select()
    .single();
    
  if (error) {
    console.error('Supabase createRisk error:', error);
    // If it's a missing column error, try without SaaS columns
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.warn('Retrying risk creation without SaaS columns...');
      const { company_id, is_template, is_global, responsible_uid, creator_uid, created_by, responsible_name, ...minimalData } = data;
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
  try {
    const { data: updated, error } = await supabase
      .from(tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return updated;
  } catch (error) {
    console.error('Supabase updateRisk error:', error);
    
    // If it's a missing column error, try without SaaS columns
    if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
      console.warn('Retrying risk update without SaaS columns...');
      const { company_id, is_template, is_global, responsible_uid, creator_uid, created_by, responsible_name, ...minimalData } = data;
      const { data: retryUpdated, error: retryError } = await supabase
        .from(tableName)
        .update(minimalData)
        .eq('id', id)
        .select()
        .single();
        
      if (retryError) throw retryError;
      return retryUpdated;
    }
    throw error;
  }
};

export const deleteRisk = async (id) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return { id };
};
