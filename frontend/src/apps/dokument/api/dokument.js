import { supabase } from '../../../supabase';

const tableName = 'documents';

export const getDokuments = async (page = 1, pageSize = 20) => {
  try {
    let query = supabase
      .from(tableName)
      .select('*, attachments(*)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (pageSize !== -1) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
      
    if (error) {
      // If the error is because the attachments relationship doesn't exist, try without it
      if (error.message.includes('relationship') || error.message.includes('column') || error.code === 'PGRST204') {
        console.warn('Failed to fetch with attachments, retrying without them...', error);
        let fallbackQuery = supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (pageSize !== -1) {
          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;
          fallbackQuery = fallbackQuery.range(from, to);
        }

        const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery;
          
        if (fallbackError) throw fallbackError;
        return pageSize === -1 ? fallbackData : { data: fallbackData, count: fallbackCount };
      }
      throw error;
    }
    return pageSize === -1 ? data : { data, count };
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

export const getGlobalTemplates = async () => {
  try {
    console.log('Fetching global templates from Supabase...');
    // Try the full query first
    const { data, error } = await supabase
      .from(tableName)
      .select('*, attachments(*)')
      .or('is_global.eq.true,company_id.is.null');
      
    if (error) {
      console.warn('Full global templates query failed, trying fallback...', error);
      
      // If it's a relationship error, try without attachments
      if (error.message.includes('relationship') || error.message.includes('column') || error.code === 'PGRST204') {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from(tableName)
          .select('*')
          .or('is_global.eq.true,company_id.is.null');
          
        if (fallbackError) {
          console.error('Fallback global templates query failed:', fallbackError);
          // Last resort: fetch all and filter
          const { data: allDocs, error: allDocsError } = await supabase
            .from(tableName)
            .select('*');
          if (allDocsError) throw allDocsError;
          return allDocs.filter(d => d.is_global === true || !d.company_id || d.is_template === true);
        }
        
        console.log(`Fetched ${fallbackData?.length || 0} global templates via fallback query`);
        return fallbackData.filter(d => d.is_global === true || !d.company_id || d.is_template === true || d.title?.toLowerCase().includes('mall'));
      }
      throw error;
    }
    
    console.log(`Fetched ${data?.length || 0} global templates`);
    // Filter to ensure we only get templates
    return data.filter(d => d.is_global === true || !d.company_id || d.is_template === true || d.title?.toLowerCase().includes('mall'));
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
  // Strip out attachments if they are present (they are a relationship, not a column)
  const { attachments, ...insertData } = data;
  
  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert([insertData])
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
