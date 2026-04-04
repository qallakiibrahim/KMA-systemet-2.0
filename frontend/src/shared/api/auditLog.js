import { supabase } from '../../supabase';

/**
 * Fetch audit logs for a specific record in a table
 * @param {string} tableName - The table name (e.g., 'avvikelser')
 * @param {string} recordId - The record ID (UUID)
 * @returns {Promise<Array>} - List of audit logs
 */
export const getAuditLogs = async (tableName, recordId) => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles:changed_by (
        display_name,
        email
      )
    `)
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }

  return data;
};

/**
 * Fetch all audit logs for the current company
 * @param {string} companyId - The company ID
 * @param {number} limit - Number of logs to fetch
 * @returns {Promise<Array>} - List of audit logs
 */
export const getCompanyAuditLogs = async (companyId, limit = 50) => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles:changed_by (
        display_name,
        email
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching company audit logs:', error);
    throw error;
  }

  return data;
};
