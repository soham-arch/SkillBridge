import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eldmwjkolqqdhfqcawvg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZG13amtvbHFxZGhmcWNhd3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NjY0ODIsImV4cCI6MjEwMjQ0MjQ4Mn0.7abu0FoK0cXheOFsC17gqJNytTvf17ddIDFNjPp6A1g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: {
    headers: {
      Authorization: 'Bearer demo-token-00000000-0000-0000-0000-000000000001'
    }
  }
});

async function run() {
  const { data, error } = await supabase.from('verification_requests').select('*');
  console.log('Query result with demo token:', { data, error });
}

run();
