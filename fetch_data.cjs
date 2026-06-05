const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('vw_dashboard_preceptores').select('*');
  console.log('Error:', error);
  console.log('First 2 rows:', JSON.stringify(data.slice(0, 2), null, 2));
}

run();
