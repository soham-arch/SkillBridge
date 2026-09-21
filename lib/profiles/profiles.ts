import { getSupabaseClient } from '@/lib/supabase/client';
import type { Profile, Capability } from '@/types';

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function upsertProfile(
  userId: string,
  fields: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'college' | 'bio' | 'location' | 'capabilities'>>
): Promise<Profile> {
  const supabase = getSupabaseClient();
  const existing = await getProfileByUserId(userId);

  if (existing) {
    const { data, error } = await supabase
      .from('profiles')
      .update(fields)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return data as Profile;
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      ...fields,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Profile;
}

export function hasCapability(profile: Profile | null, cap: Capability): boolean {
  if (!profile) return false;
  return profile.capabilities?.includes(cap) ?? false;
}
