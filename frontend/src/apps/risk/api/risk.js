import { supabase } from '../../../supabase';
import { logAction } from '../../../shared/api/auditLog';

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

export const getOpenRisker = async () => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .not('status', 'eq', 'closed')
    .not('deadline', 'is', null);
    
  if (error) throw error;
  return data;
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

export const createRisk = async (data, user = null) => {
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

      if (user) {
        logAction({
          action: 'CREATE',
          entity_type: 'RISK',
          entity_id: retryInserted.id,
          entity_name: retryInserted.title,
          changes: { new: retryInserted },
          user_id: user.id,
          user_email: user.email,
          company_id: retryInserted.company_id
        });
      }

      return retryInserted;
    }
    throw error;
  }

  if (user) {
    logAction({
      action: 'CREATE',
      entity_type: 'RISK',
      entity_id: inserted.id,
      entity_name: inserted.title,
      changes: { new: inserted },
      user_id: user.id,
      user_email: user.email,
      company_id: inserted.company_id
    });
  }

  return inserted;
};

export const updateRisk = async (id, data, user = null) => {
  try {
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
        entity_type: 'RISK',
        entity_id: id,
        entity_name: updated.title,
        changes: { old: oldData, new: updated },
        user_id: user.id,
        user_email: user.email,
        company_id: updated.company_id
      });
    }

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

      if (user) {
        logAction({
          action: 'UPDATE',
          entity_type: 'RISK',
          entity_id: id,
          entity_name: retryUpdated.title,
          user_id: user.id,
          user_email: user.email,
          company_id: retryUpdated.company_id
        });
      }

      return retryUpdated;
    }
    throw error;
  }
};

export const deleteRisk = async (id, user = null) => {
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
      entity_type: 'RISK',
      entity_id: id,
      entity_name: entityName,
      user_id: user.id,
      user_email: user.email,
      company_id: companyId
    });
  }

  return { id };
};
