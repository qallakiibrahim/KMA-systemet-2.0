import { supabase } from '../../../supabase';

export const getDocuments = async (companyId) => {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      attachments (*)
    `)
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getDocumentById = async (id) => {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      attachments (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const saveDocument = async (documentData) => {
  const { id, attachments, ...rest } = documentData;

  let result;
  if (id) {
    const { data, error } = await supabase
      .from('documents')
      .update(rest)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('documents')
      .insert(rest)
      .select()
      .single();
    if (error) throw error;
    result = data;
  }

  return result;
};

export const deleteDocument = async (id) => {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const uploadAttachment = async (file, documentId, userId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `attachments/${documentId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  const { data, error: dbError } = await supabase
    .from('attachments')
    .insert({
      document_id: documentId,
      file_name: file.name,
      file_url: publicUrl,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: userId
    })
    .select()
    .single();

  if (dbError) throw dbError;
  return data;
};

export const deleteAttachment = async (id, filePath) => {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([filePath]);

  if (storageError) console.error('Storage delete error:', storageError);

  // Delete from DB
  const { error: dbError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id);

  if (dbError) throw dbError;
};
