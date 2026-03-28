import { supabase } from '../../../supabase';

const tableName = 'documents';

export const getDokuments = async () => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*, attachments(*)')
      .order('created_at', { ascending: false });
      
    if (error) {
      // If the error is because the attachments relationship doesn't exist, try without it
      if (error.message.includes('relationship') || error.message.includes('column') || error.code === 'PGRST204') {
        console.warn('Failed to fetch with attachments, retrying without them...', error);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false });
          
        if (fallbackError) throw fallbackError;
        return fallbackData;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

export const getGlobalTemplates = async () => {
  try {
    // Try the full query first
    const { data, error } = await supabase
      .from(tableName)
      .select('*, attachments(*)')
      .or('is_global.eq.true,and(company_id.is.null,title.ilike.%mall%)');
      
    if (error) {
      console.warn('Full global templates query failed, trying fallback...', error);
      // Fallback: just fetch all and filter in JS if columns are missing
      const { data: allDocs, error: allDocsError } = await supabase
        .from(tableName)
        .select('*');
        
      if (allDocsError) throw allDocsError;
      
      return allDocs.filter(d => 
        d.is_global === true || 
        (!d.company_id && d.title?.toLowerCase().includes('mall')) ||
        d.is_template === true
      );
    }
    return data;
  } catch (error) {
    console.error('Error fetching global templates:', error);
    return [];
  }
};

export const getDokumentById = async (id) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*, attachments(*)')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.message.includes('relationship') || error.message.includes('column') || error.code === 'PGRST204') {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();
          
        if (fallbackError) throw fallbackError;
        return fallbackData;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching document by id:', error);
    throw error;
  }
};

export const createDokument = async (data) => {
  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert([data])
    .select()
    .single();
    
  if (error) {
    console.error('Supabase createDokument error:', error);
    // If it's a missing column error, try without SaaS columns
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      if (error.message.includes('iso_chapter')) {
        console.warn('Retrying document creation without iso_chapter...');
        const { iso_chapter, ...dataWithoutIso } = data;
        const { data: retryInserted, error: retryError } = await supabase
          .from(tableName)
          .insert([dataWithoutIso])
          .select()
          .single();
          
        if (retryError) throw retryError;
        return retryInserted;
      }

      console.warn('Retrying document creation without SaaS columns...');
      const { company_id, is_template, is_global, iso_chapter, ...minimalData } = data;
      const { data: retryInserted, error: retryError } = await supabase
        .from(tableName)
        .insert([minimalData])
        .select()
        .single();
        
      if (retryError) throw retryError;
      return retryInserted;
    }
    
    // Fallback for not-null constraint on company_id
    if (error.message.includes('column "company_id"') && error.message.includes('violates not-null constraint')) {
      console.warn('Retrying document creation with a default company...');
      const { data: companies } = await supabase.from('companies').select('id').limit(1);
      if (companies && companies.length > 0) {
        data.company_id = companies[0].id;
        const { data: retryInserted, error: retryError } = await supabase
          .from(tableName)
          .insert([data])
          .select()
          .single();
          
        if (retryError) throw retryError;
        return retryInserted;
      } else {
        throw new Error('Du måste tillhöra ett företag för att spara dokument.');
      }
    }

    // Fallback for not-null constraint on file_url
    if (error.message.includes('column "file_url"') && error.message.includes('violates not-null constraint')) {
      console.warn('Retrying document creation with empty file_url...');
      data.file_url = ''; 
      const { data: retryInserted, error: retryError } = await supabase
        .from(tableName)
        .insert([data])
        .select()
        .single();
        
      if (retryError) throw retryError;
      return retryInserted;
    }

    throw error;
  }
  return inserted;
};

export const updateDokument = async (id, data) => {
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
    console.error('Supabase updateDokument error:', error);
    
    // Fallback for missing columns
    if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
      if (error.message.includes('iso_chapter')) {
        console.warn('Retrying document update without iso_chapter...');
        const { iso_chapter, ...dataWithoutIso } = data;
        const { data: retryUpdated, error: retryError } = await supabase
          .from(tableName)
          .update(dataWithoutIso)
          .eq('id', id)
          .select()
          .single();
          
        if (retryError) throw retryError;
        return retryUpdated;
      }
    }

    // Fallback for not-null constraint on file_url
    if (error.message && error.message.includes('column "file_url"') && error.message.includes('violates not-null constraint')) {
      console.warn('Retrying document update with empty file_url...');
      data.file_url = ''; 
      const { data: retryUpdated, error: retryError } = await supabase
        .from(tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (retryError) throw retryError;
      return retryUpdated;
    }
    
    throw error;
  }
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
