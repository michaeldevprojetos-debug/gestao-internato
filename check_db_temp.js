import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// read the env vars from .env file since dotenv is not installed
const envPath = path.resolve(process.cwd(), '.env');
const envStr = fs.readFileSync(envPath, 'utf-8');
let url = '';
let key = '';
envStr.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function testInsert() {
  console.log("URL:", url);
  
  // try to fetch vinculo_operacional
  const { data: readData, error: readErr } = await supabase.from('vinculo_operacional').select('*').limit(1);
  console.log("Read error:", readErr?.message);
  console.log("Read data length:", readData?.length);

  // try to fetch preceptores
  const { data: pData, error: pErr } = await supabase.from('preceptores').select('*').limit(1);
  console.log("Preceptores error:", pErr?.message);
  console.log("Preceptores data length:", pData?.length);

  // try insert
  const { error: insertErr } = await supabase.from('vinculo_operacional').insert({
    preceptor_id: '00000000-0000-0000-0000-000000000000',
    aluno_id: null,
    quantidade_alunos: 0,
    mes_referencia: '2026-06'
  });
  console.log("Insert error:", insertErr?.message);
}
testInsert();
