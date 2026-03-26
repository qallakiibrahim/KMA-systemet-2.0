import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFk() {
  const { data, error } = await supabase.rpc('get_foreign_keys');
  console.log('Data:', data);
  console.log('Error:', error);
}
testFk();
