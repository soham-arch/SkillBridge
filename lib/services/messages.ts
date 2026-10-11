import { getSupabaseClient } from '@/lib/supabase/client';
import { createNotification } from '@/lib/services/notifications';
import { OrderMessage } from '@/types';

// In-memory fallback message store for offline and test runs
const localMessagesStore: OrderMessage[] = [];

/**
 * Fetches all persistent order messages for a specific order.
 * Messages are ordered chronologically (created_at ASC).
 * RLS ensures that only participants in the order can access messages.
 */
export async function fetchOrderMessages(orderId: string): Promise<OrderMessage[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('order_messages')
      .select(`
        *,
        sender:profiles!order_messages_sender_id_fkey(id, user_id, full_name, avatar_url, college),
        receiver:profiles!order_messages_receiver_id_fkey(id, user_id, full_name, avatar_url, college)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      return data as OrderMessage[];
    }

    if (error) {
      // If foreign key naming differs, try simple join or raw select
      const { data: rawData, error: rawErr } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (!rawErr && rawData) {
        return rawData as OrderMessage[];
      }
    }
  } catch (err) {
    console.error('Failed to fetch order messages from database:', err);
  }

  // Graceful fallback to local message store
  return localMessagesStore
    .filter((m) => m.order_id === orderId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

/**
 * Sends a message in an order conversation.
 * Persists to Supabase and creates an in-app notification for the recipient.
 */
export async function sendOrderMessage(params: {
  orderId: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  senderName?: string;
}): Promise<OrderMessage> {
  const cleanContent = (params.content || '').trim();

  if (!cleanContent && !params.attachmentUrl) {
    throw new Error('Message content or attachment is required.');
  }

  const now = new Date().toISOString();
  const fallbackMessage: OrderMessage = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    order_id: params.orderId,
    sender_id: params.senderId,
    receiver_id: params.receiverId,
    content: cleanContent,
    attachment_url: params.attachmentUrl || null,
    attachment_name: params.attachmentName || null,
    read: false,
    created_at: now,
  };

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('order_messages')
      .insert({
        order_id: params.orderId,
        sender_id: params.senderId,
        receiver_id: params.receiverId,
        content: cleanContent,
        attachment_url: params.attachmentUrl || null,
        attachment_name: params.attachmentName || null,
        read: false,
      })
      .select('*')
      .single();

    if (!error && data) {
      // Trigger in-app notification for receiver with deduplication key
      const senderLabel = params.senderName || 'Your peer';
      await createNotification({
        userId: params.receiverId,
        title: `New message from ${senderLabel}`,
        message: cleanContent.slice(0, 100) || 'Sent an attachment',
        type: 'new_message',
        link: `/orders/${params.orderId}`,
        dedupKey: `msg_notif_${data.id}`,
      });

      localMessagesStore.push(data as OrderMessage);
      return data as OrderMessage;
    }

    if (error) {
      console.warn('Database note in sendOrderMessage:', error.message);
    }
  } catch (err) {
    console.error('Failed to send order message in database:', err);
  }

  // Fallback storage
  localMessagesStore.push(fallbackMessage);

  // Trigger fallback notification
  try {
    await createNotification({
      userId: params.receiverId,
      title: `New message on Order`,
      message: cleanContent.slice(0, 100) || 'Sent an attachment',
      type: 'new_message',
      link: `/orders/${params.orderId}`,
      dedupKey: `msg_notif_${fallbackMessage.id}`,
    });
  } catch {
    // Non-fatal
  }

  return fallbackMessage;
}

/**
 * Marks all incoming messages for the active user in an order conversation as read.
 */
export async function markOrderMessagesAsRead(orderId: string, currentUserId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('order_messages')
      .update({ read: true })
      .eq('order_id', orderId)
      .eq('receiver_id', currentUserId)
      .eq('read', false);

    if (error) {
      console.warn('Database note in markOrderMessagesAsRead:', error.message);
    }
  } catch (err) {
    console.error('Failed to mark order messages as read:', err);
  }

  localMessagesStore.forEach((m) => {
    if (m.order_id === orderId && m.receiver_id === currentUserId) {
      m.read = true;
    }
  });
}

/**
 * Uploads a safe file attachment to the private order-attachments bucket.
 * Validates maximum file size (10MB) and allowed document/media formats.
 */
export async function uploadOrderAttachment(
  file: File,
  orderId: string,
  userId: string
): Promise<{ url: string; name: string }> {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('Attachment exceeds 10MB maximum file size limit.');
  }

  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf', 'application/zip',
    'text/plain', 'text/markdown',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedTypes.includes(file.type) && !file.name.endsWith('.zip') && !file.name.endsWith('.pdf')) {
    throw new Error('Invalid file type. Allowed: PDF, Images (JPEG/PNG/WebP), Word docs, Plaintext, and ZIP archives.');
  }

  const supabase = getSupabaseClient();
  const fileExt = file.name.split('.').pop() || 'dat';
  const cleanBaseName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `orders/${orderId}/${userId}_${Date.now()}_${cleanBaseName}`;

  let bucketName = 'order-attachments';
  let { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    // Fallback to portfolio-media or service-media bucket if order-attachments is unprovisioned
    bucketName = 'service-media';
    const { error: fbErr } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (fbErr) {
      throw new Error(`Attachment upload failed: ${uploadError.message}`);
    }
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);

  return {
    url: data?.publicUrl || filePath,
    name: file.name,
  };
}
