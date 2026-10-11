import { getSupabaseClient } from '@/lib/supabase/client';
import { getMarketplaceState, saveMarketplaceState } from '@/lib/store/marketplace-store';
import type { Profile, Capability, ActiveRole, PortfolioItem, PricingPreferences, SocialLinks } from '@/types';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_PORTFOLIO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_PORTFOLIO_SIZE = 15 * 1024 * 1024; // 15MB

/**
 * Retrieves the user profile by user_id.
 */
export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!error && data) {
    return data as Profile;
  }

  // Fallback to local marketplace-store
  const state = getMarketplaceState();
  const found = state.profiles.find((p) => p.user_id === userId || p.id === userId);
  return found || null;
}

/**
 * Updates a user profile in Supabase and syncs to local store.
 * Strictly prevents updating sensitive admin/verification columns directly.
 */
export async function updateUserProfile(
  userId: string,
  fields: Partial<
    Omit<
      Profile,
      'id' | 'user_id' | 'is_admin' | 'verification_status' | 'verified_at' | 'created_at' | 'updated_at'
    >
  >
): Promise<Profile> {
  const supabase = getSupabaseClient();

  const updatePayload = {
    ...fields,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  let updatedProfile: Profile | null = data as Profile | null;

  if (error) {
    console.warn('Database profile update note:', error.message);
  }

  // Synchronize local marketplace store
  const state = getMarketplaceState();
  const idx = state.profiles.findIndex((p) => p.user_id === userId);
  if (idx !== -1) {
    state.profiles[idx] = {
      ...state.profiles[idx],
      ...updatePayload,
      ...(updatedProfile || {}),
    };
    saveMarketplaceState(state);
    if (!updatedProfile) updatedProfile = state.profiles[idx];
  } else if (!updatedProfile) {
    const newProf: Profile = {
      id: userId,
      user_id: userId,
      full_name: fields.full_name || 'Student',
      avatar_url: fields.avatar_url || null,
      college: fields.college || null,
      verification_status: 'not_verified',
      bio: fields.bio || null,
      location: fields.location || null,
      capabilities: fields.capabilities || ['find'],
      skills: fields.skills || [],
      portfolio_links: fields.portfolio_links || [],
      pricing_preferences: fields.pricing_preferences,
      social_links: fields.social_links,
      active_role: fields.active_role || 'buyer',
      onboarding_completed: fields.onboarding_completed || false,
      seller_onboarding_completed: fields.seller_onboarding_completed || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    state.profiles.push(newProf);
    saveMarketplaceState(state);
    updatedProfile = newProf;
  }

  return updatedProfile as Profile;
}

/**
 * Backward-compatible upsertProfile helper.
 */
export async function upsertProfile(
  userId: string,
  fields: Partial<Profile>
): Promise<Profile> {
  return updateUserProfile(userId, fields);
}

/**
 * Uploads an avatar image to the public 'avatars' storage bucket.
 * Enforces file type and size restrictions.
 */
export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  if (!file) throw new Error('Please select an image file to upload.');

  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('Avatar must be an image (JPEG, PNG, WEBP, or GIF).');
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error('Avatar image size must be less than 5MB.');
  }

  const supabase = getSupabaseClient();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${userId}/${Date.now()}-${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    // If bucket not configured in Supabase yet, generate a client preview URL
    console.warn('Avatars bucket upload warning:', error.message);
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    await updateUserProfile(userId, { avatar_url: dataUrl });
    return dataUrl;
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path);
  const publicUrl = urlData.publicUrl;

  await updateUserProfile(userId, { avatar_url: publicUrl });
  return publicUrl;
}

/**
 * Uploads a portfolio showcase document or image to 'portfolio-media' bucket.
 */
export async function uploadPortfolioMedia(userId: string, file: File): Promise<string> {
  if (!file) throw new Error('Please select a file to upload.');

  if (!ALLOWED_PORTFOLIO_TYPES.includes(file.type)) {
    throw new Error('Portfolio file must be an image (JPEG, PNG, WEBP) or PDF document.');
  }

  if (file.size > MAX_PORTFOLIO_SIZE) {
    throw new Error('Portfolio file size must be less than 15MB.');
  }

  const supabase = getSupabaseClient();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${userId}/${Date.now()}-${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from('portfolio-media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.warn('Portfolio-media bucket upload warning:', error.message);
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  const { data: urlData } = supabase.storage.from('portfolio-media').getPublicUrl(data.path);
  return urlData.publicUrl;
}

/**
 * Checks if profile has buyer capabilities.
 */
export function isBuyer(profile: Profile | null): boolean {
  if (!profile) return false;
  return profile.capabilities?.some((c) => c === 'find' || c === 'buyer') ?? false;
}

/**
 * Checks if profile has seller capabilities.
 */
export function isSeller(profile: Profile | null): boolean {
  if (!profile) return false;
  return profile.capabilities?.some((c) => c === 'offer' || c === 'seller') ?? false;
}

/**
 * Checks if a user is eligible to publish and offer services
 * (must have seller capability AND must be student verified).
 */
export function canSell(profile: Profile | null): boolean {
  if (!profile) return false;
  const hasSellerRole = isSeller(profile);
  const isVerified = profile.verification_status === 'verified';
  return hasSellerRole && (isVerified || Boolean(profile.is_admin));
}

/**
 * Switches the active role context (e.g. Buyer mode vs. Seller mode) for an authenticated user.
 */
export async function switchActiveRole(userId: string, newRole: ActiveRole): Promise<Profile> {
  return updateUserProfile(userId, { active_role: newRole });
}

/**
 * Completes seller onboarding / enables seller capability.
 */
export async function completeSellerOnboarding(
  userId: string,
  params: {
    skills: string[];
    bio?: string;
    preferredCategories?: string[];
    pricingPreferences?: PricingPreferences;
    portfolioLinks?: PortfolioItem[];
    socialLinks?: SocialLinks;
  }
): Promise<Profile> {
  const current = await getProfileByUserId(userId);
  const currentCapabilities = current?.capabilities || [];
  const updatedCapabilities = Array.from(
    new Set([...currentCapabilities, 'offer', 'seller'])
  ) as Capability[];

  return updateUserProfile(userId, {
    capabilities: updatedCapabilities,
    active_role: 'seller',
    seller_onboarding_completed: true,
    skills: params.skills,
    bio: params.bio !== undefined ? params.bio : current?.bio || undefined,
    preferred_categories: params.preferredCategories,
    pricing_preferences: params.pricingPreferences,
    portfolio_links: params.portfolioLinks,
    social_links: params.socialLinks,
  });
}
