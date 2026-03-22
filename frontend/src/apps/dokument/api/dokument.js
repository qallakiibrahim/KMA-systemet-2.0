import { supabase } from '../../../supabase';

const tableName = 'documents';

export const getDokuments = async () => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
};

export const createDokument = async (data) => {
  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert([data])
    .select()
    .single();
    
  if (error) throw error;
  return inserted;
};

export const updateDokument = async (id, data) => {
  const { data: updated, error } = await supabase
    .from(tableName)
    .update(data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return updated;
};

export const deleteDokument = async (id) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return { id };
};

export const uploadDocument = async (file) => {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const filePath = `${timestamp}_${safeName}`;

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(filePath, file);

  if (error) {
    if (error.message.includes('bucket not found')) {
      throw new Error('Supabase Storage bucket "documents" saknas. Skapa en publik bucket med namnet "documents" i din Supabase-panel.');
    }
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  return {
    name: file.name,
    url: publicUrl,
    type: file.type,
    size: file.size
  };
};
