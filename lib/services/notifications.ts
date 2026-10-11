import { getSupabaseClient } from '@/lib/supabase/client';
import { NotificationItem } from '@/types';

// In-memory fallback notification cache for local testing / offline sessions
const localNotificationsStore: NotificationItem[] = [];

/**
 * Fetches notifications for a user from Supabase.
 * Enforces user ownership boundary through Supabase RLS.
 */
export async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      return data as NotificationItem[];
    }
    if (error) {
      console.warn('Database note in fetchNotifications:', error.message);
    }
  } catch (err) {
    console.error('Failed to fetch notifications from Supabase:', err);
  }

  // Graceful fallback to local user notifications if database is offline
  return localNotificationsStore
    .filter((n) => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Fetches the count of unread notifications for a user.
 */
export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (!error && count !== null) {
      return count;
    }
  } catch {
    // Non-fatal
  }

  return localNotificationsStore.filter((n) => n.user_id === userId && !n.read).length;
}

/**
 * Marks a specific notification as read in Supabase.
 */
export async function readNotification(id: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) {
      console.warn('Database note in readNotification:', error.message);
    }
  } catch (err) {
    console.error('Failed to update notification in database:', err);
  }

  const localItem = localNotificationsStore.find((n) => n.id === id);
  if (localItem) localItem.read = true;
}

/**
 * Marks all unread notifications for a user as read.
 */
export async function readAllNotifications(userId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.warn('Database note in readAllNotifications:', error.message);
    }
  } catch (err) {
    console.error('Failed to mark all notifications as read in database:', err);
  }

  localNotificationsStore.forEach((n) => {
    if (n.user_id === userId) n.read = true;
  });
}

/**
 * Creates an in-app notification with deduplication support to prevent repeated alerts from webhook retries.
 */
export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  dedupKey?: string;
}): Promise<NotificationItem> {
  const now = new Date().toISOString();
  const newNotification: NotificationItem = {
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    user_id: params.userId,
    title: params.title,
    message: params.message,
    type: params.type,
    link: params.link,
    dedup_key: params.dedupKey || null,
    read: false,
    created_at: now,
  };

  // 1. Deduplication check in local store
  if (params.dedupKey) {
    const existing = localNotificationsStore.find((n) => n.dedup_key === params.dedupKey);
    if (existing) {
      return existing;
    }
  }

  try {
    const supabase = getSupabaseClient();

    // Check if duplicate exists in database if dedupKey provided
    if (params.dedupKey) {
      const { data: existingDb } = await supabase
        .from('notifications')
        .select('*')
        .eq('dedup_key', params.dedupKey)
        .maybeSingle();

      if (existingDb) {
        return existingDb as NotificationItem;
      }
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link || null,
        dedup_key: params.dedupKey || null,
        read: false,
      })
      .select('*')
      .maybeSingle();

    if (!error && data) {
      localNotificationsStore.unshift(data as NotificationItem);
      return data as NotificationItem;
    }

    if (error && error.code !== '23505') {
      console.warn('Database note in createNotification:', error.message);
    }
  } catch (err) {
    console.error('Failed to create notification in database:', err);
  }

  localNotificationsStore.unshift(newNotification);
  return newNotification;
}
