import { supabase } from '../../../supabase';

const tableName = 'profiles';

export const getUsers = async () => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('display_name', { ascending: true });
    
  if (error) throw error;
  return data;
};

export const updateUserRole = async (userId, role) => {
  const { data, error } = await supabase
    .from(tableName)
    .update({ role })
    .eq('id', userId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};
