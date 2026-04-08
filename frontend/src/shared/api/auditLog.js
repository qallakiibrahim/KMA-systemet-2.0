import { supabase } from '../../supabase';

const tableName = 'audit_logs';

/**
 * Log an action to the audit trail
 * @param {Object} params
 * @param {string} params.action - The action performed (e.g., 'CREATE', 'UPDATE', 'DELETE')
 * @param {string} params.entity_type - The type of entity (e.g., 'PROCESS', 'DOCUMENT')
 * @param {string} params.entity_id - The ID of the entity
 * @param {string} params.entity_name - The name/title of the entity for easy reading
 * @param {Object} params.changes - Optional object containing old and new values
 * @param {string} params.user_id - The ID of the user who performed the action
 * @param {string} params.user_email - The email of the user
 * @param {string} params.company_id - The ID of the company
 */
export const logAction = async ({ 
  action, 
  entity_type, 
  entity_id, 
  entity_name, 
  changes = null, 
  user_id, 
  user_email,
  company_id
}) => {
  try {
    const { error } = await supabase
      .from(tableName)
      .insert([{
        action,
        entity_type,
        entity_id,
        entity_name,
        changes,
        user_id,
        user_email,
        company_id,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error creating audit log:', error);
      // Don't throw here to avoid breaking the main application flow
      return null;
    }
  } catch (err) {
    console.error('Failed to log action:', err);
  }
};

/**
 * Get audit logs with pagination
 */
export const getAuditLogs = async (page = 1, pageSize = 20, filters = {}) => {
  try {
    let query = supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await query.range(from, to);

    if (error) throw error;
    return { data, count };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

/**
 * Get recent audit logs for a specific company
 */
export const getCompanyAuditLogs = async (companyId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching company audit logs:', error);
    return [];
  }
};
