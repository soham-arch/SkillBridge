import { getSupabaseClient } from '@/lib/supabase/client';
import type { Category } from '@/types';

export async function getCategories(): Promise<Category[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as Category[]) ?? [];
}
