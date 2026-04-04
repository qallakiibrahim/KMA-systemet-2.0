import { supabase } from '../../../supabase';

const tableName = 'avvikelser';
const bucketName = 'avvikelser';

export const compressImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, file.type, quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const uploadAttachment = async (file) => {
  try {
    const compressedFile = await compressImage(file);
    const timestamp = Date.now();
    const safeName = compressedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filePath = `${timestamp}_${safeName}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, compressedFile);

    if (error) {
      if (error.message.includes('bucket not found')) {
        throw new Error('Supabase Storage bucket "avvikelser" saknas. Skapa en publik bucket med namnet "avvikelser" i din Supabase-panel.');
      }
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      name: compressedFile.name,
      url: publicUrl,
      type: compressedFile.type,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};

export const getAvvikelser = async (page = 1, pageSize = 20) => {
  console.log('getAvvikelser called with:', { page, pageSize });
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
    console.error('getAvvikelser error:', error);
    throw error;
  }
  
  console.log('getAvvikelser result:', { count, dataLength: data?.length });
  return pageSize === -1 ? data : { data, count };
};

export const createAvvikelse = async (data) => {
  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert([data])
    .select()
    .single();
    
  if (error) throw error;
  return inserted;
};

export const updateAvvikelse = async (id, data) => {
  const { data: updated, error } = await supabase
    .from(tableName)
    .update(data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return updated;
};

export const deleteAvvikelse = async (id) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return { id };
};
