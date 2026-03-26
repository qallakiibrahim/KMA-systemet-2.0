import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuth() {
  const { data, error } = await supabase.auth.admin.listUsers();
  console.log('Users:', data);
  console.log('Error:', error);
}
checkAuth();
