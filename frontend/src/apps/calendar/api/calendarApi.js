import { supabase } from '../../../supabase';
import { logAction } from '../../../shared/api/auditLog';

const tableName = 'calendar_events';

export const getEvents = async () => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
};

export const createEvent = async (data, user = null) => {
  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert([data])
    .select()
    .single();
    
  if (error) throw error;

  if (user) {
    logAction({
      action: 'CREATE',
      entity_type: 'CALENDAR_EVENT',
      entity_id: inserted.id,
      entity_name: inserted.title,
      user_id: user.id,
      user_email: user.email,
      company_id: inserted.company_id
    });
  }

  return inserted;
};

export const updateEvent = async (id, data, user = null) => {
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
      entity_type: 'CALENDAR_EVENT',
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

export const deleteEvent = async (id, user = null) => {
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
      entity_type: 'CALENDAR_EVENT',
      entity_id: id,
      entity_name: entityName,
      user_id: user.id,
      user_email: user.email,
      company_id: companyId
    });
  }

  return { id };
};
