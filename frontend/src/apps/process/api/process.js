import { supabase } from '../../../supabase';

const tableName = 'processes';

export const getProcesses = async (page = 1, pageSize = 20) => {
  try {
    console.log(`Fetching processes: page=${page}, pageSize=${pageSize}`);
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
      console.error('Supabase getProcesses error:', error);
      throw error;
    }
    
    console.log(`Fetched ${data?.length || 0} processes, total count: ${count}`);
    return pageSize === -1 ? data : { data, count };
  } catch (error) {
    console.error('Error in getProcesses:', error);
    throw error;
  }
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
  // Strip out attachments if they are present (they are a relationship, not a column)
  const { attachments, ...insertData } = data;
  
  // Defensive: try to insert, if it fails due to missing columns, try a minimal version
  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert([insertData])
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
  try {
    console.log(`Updating process ${id} with data:`, JSON.stringify(data, null, 2));
    // Strip out attachments if they are present (they are a relationship, not a column)
    const { attachments, ...updateData } = data;

    const { data: updated, error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Supabase updateProcess error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // If it's a missing column error, try without SaaS columns
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.warn('Retrying process update without SaaS columns...');
        const { company_id, is_template, is_global, category, ...minimalData } = updateData;
        const { data: retryUpdated, error: retryError } = await supabase
          .from(tableName)
          .update(minimalData)
          .eq('id', id)
          .select()
          .single();
          
        if (retryError) {
          console.error('Retry update failed:', retryError);
          throw retryError;
        }
        console.log('Retry update successful:', retryUpdated);
        return retryUpdated;
      }
      
      throw error;
    }
    console.log('Update successful:', updated);
    return updated;
  } catch (error) {
    console.error('Error in updateProcess:', error);
    throw error;
  }
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
