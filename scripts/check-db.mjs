import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const envPath = path.join(rootDir, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  console.log('Testing Supabase queries with URL:', SUPABASE_URL);
  
  // 1. Check verification_requests with anon
  const res1 = await supabase.from('verification_requests').select('*');
  console.log('Anon select verification_requests:', { count: res1.data?.length, error: res1.error });
  if (res1.data && res1.data.length > 0) {
    console.log('Sample verification request:', JSON.stringify(res1.data[0], null, 2));
  }

  // 2. Test the join used in admin verification
  const res2 = await supabase
    .from('verification_requests')
    .select(`
      *,
      user:profiles!verification_requests_user_id_fkey(
        id,
        full_name,
        avatar_url,
        email,
        college
      )
    `);
  console.log('Select with join:', { count: res2.data?.length, error: res2.error });

  // 3. Check profiles
  const res3 = await supabase.from('profiles').select('id, user_id, full_name, email, is_admin, verification_status');
  console.log('Profiles:', { count: res3.data?.length, error: res3.error });
  if (res3.data) {
    console.log('Profiles data:', JSON.stringify(res3.data, null, 2));
  }
}

test().catch(console.error);
