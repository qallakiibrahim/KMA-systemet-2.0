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

  const performSave = async (dataToSave) => {
    if (id) {
      const { data, error } = await supabase
        .from('documents')
        .update(dataToSave)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('documents')
        .insert(dataToSave)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  };

  try {
    return await performSave(rest);
  } catch (error) {
    console.error('Supabase saveDocument error:', error);
    
    // Fallback for missing columns (e.g. if schema is not updated)
    if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
      throw new Error('Databasen saknar nödvändiga kolumner (t.ex. content, company_id). Vänligen kör SQL-skriptet "supabase_schema.sql" i Supabase för att uppdatera databasen.');
    }
    
    // Fallback for not-null constraint on company_id
    if (error.message && error.message.includes('column "company_id"') && error.message.includes('violates not-null constraint')) {
      console.warn('Retrying document save with a default company...');
      try {
        // Try to fetch any available company
        const { data: companies } = await supabase.from('companies').select('id').limit(1);
        if (companies && companies.length > 0) {
          rest.company_id = companies[0].id;
          return await performSave(rest);
        } else {
          throw new Error('Du måste tillhöra ett företag för att spara dokument.');
        }
      } catch (retryError) {
        console.error('Retry with default company failed:', retryError);
        throw retryError;
      }
    }

    // Fallback for not-null constraint on file_url
    if (error.message && error.message.includes('column "file_url"') && error.message.includes('violates not-null constraint')) {
      console.warn('Retrying document save with empty file_url...');
      try {
        rest.file_url = ''; // Provide an empty string if it's required but we don't have one
        return await performSave(rest);
      } catch (retryError) {
        console.error('Retry with empty file_url failed:', retryError);
        throw retryError;
      }
    }

    throw error;
  }
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
