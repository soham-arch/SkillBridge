-- SkillBridge Feature 09: Order Messaging & Event Notifications
-- Migration: 20260822240000_014_order_messaging_and_notifications.sql
--
-- 1. Creates order_messages table for persistent buyer-seller communication
-- 2. Configures Row Level Security restricting access strictly to order participants
-- 3. Adds dedup_key to notifications table to prevent duplicate events
-- 4. Configures private order-attachments storage bucket with participant-only access
-- 5. Enables Realtime replication on order_messages and notifications

-- 1. Create order_messages table
CREATE TABLE IF NOT EXISTS public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  content text NOT NULL,
  attachment_url text,
  attachment_name text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient thread loading and unread counting
CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON public.order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_created_at ON public.order_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_order_messages_receiver_read ON public.order_messages(receiver_id, read);
CREATE INDEX IF NOT EXISTS idx_order_messages_sender ON public.order_messages(sender_id);

-- 2. Row Level Security for order_messages
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: Only buyer, seller, or admin of the specific order can read messages
DROP POLICY IF EXISTS "order_messages_select_participants" ON public.order_messages;
CREATE POLICY "order_messages_select_participants" ON public.order_messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() = sender_id OR
    auth.uid() = receiver_id OR
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_messages.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

-- INSERT: Authenticated sender must be a participant in the referenced order
DROP POLICY IF EXISTS "order_messages_insert_sender" ON public.order_messages;
CREATE POLICY "order_messages_insert_sender" ON public.order_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_messages.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

-- UPDATE: Receiver can update read status
DROP POLICY IF EXISTS "order_messages_update_receiver" ON public.order_messages;
CREATE POLICY "order_messages_update_receiver" ON public.order_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- 3. Notifications Deduplication Support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'dedup_key'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN dedup_key text DEFAULT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_key
  ON public.notifications(dedup_key)
  WHERE dedup_key IS NOT NULL;

-- 4. Storage Bucket Configuration for Private Order Files
DO $$
BEGIN
  -- Insert private order-attachments bucket if missing
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'order-attachments'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'order-attachments',
      'order-attachments',
      false, -- Strictly PRIVATE: No public access
      10485760, -- 10MB limit
      ARRAY[
        'image/jpeg', 'image/png', 'image/webp',
        'application/pdf', 'application/zip',
        'text/plain', 'text/markdown',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Non-fatal if storage.buckets not directly writable in some environments
END $$;

-- Storage RLS: Participant-only download & upload for order attachments
DO $$
BEGIN
  DROP POLICY IF EXISTS "order_attachments_select_participants" ON storage.objects;
  CREATE POLICY "order_attachments_select_participants" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'order-attachments' AND
      (
        EXISTS (
          SELECT 1 FROM public.orders
          WHERE orders.id::text = (storage.foldername(name))[1]
          AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
        ) OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
        )
      )
    );

  DROP POLICY IF EXISTS "order_attachments_insert_participants" ON storage.objects;
  CREATE POLICY "order_attachments_insert_participants" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'order-attachments' AND
      EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id::text = (storage.foldername(name))[1]
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 5. Realtime Publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
