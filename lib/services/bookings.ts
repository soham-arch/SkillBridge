import { getSupabaseClient } from '@/lib/supabase/client';
import type { AvailabilitySlot, Booking, BookingStatus } from '@/types';

/* ─── Availability Slots ─── */

export async function getAvailabilitySlots(providerId: string): Promise<AvailabilitySlot[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return (data as AvailabilitySlot[]) ?? [];
}

export async function getMyAvailabilitySlots(): Promise<AvailabilitySlot[]> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('provider_id', session.user.id)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return (data as AvailabilitySlot[]) ?? [];
}

export async function upsertAvailabilitySlot(
  slot: Omit<AvailabilitySlot, 'id' | 'created_at' | 'updated_at'>
): Promise<AvailabilitySlot> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('availability_slots')
    .insert(slot)
    .select('*')
    .single();

  if (error) throw error;
  return data as AvailabilitySlot;
}

export async function deleteAvailabilitySlot(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('availability_slots')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/* ─── Bookings ─── */

export async function getBookingsForDate(
  providerId: string,
  date: string
): Promise<Booking[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('provider_id', providerId)
    .eq('booking_date', date)
    .eq('status', 'confirmed');

  if (error) throw error;
  return (data as Booking[]) ?? [];
}

export async function createBooking(input: {
  service_id: string;
  customer_id: string;
  provider_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  note?: string;
}): Promise<string> {
  const supabase = getSupabaseClient();

  // Use the atomic RPC function to prevent double-booking
  const { data, error } = await supabase.rpc('book_service', {
    p_service_id: input.service_id,
    p_customer_id: input.customer_id,
    p_provider_id: input.provider_id,
    p_booking_date: input.booking_date,
    p_start_time: input.start_time,
    p_end_time: input.end_time,
    p_note: input.note ?? '',
  });

  if (error) {
    // Extract the human-readable message from Postgres exception
    const msg = error.message || 'Booking failed. Please try again.';
    throw new Error(msg);
  }

  return data as string;
}

export async function getMyBookingsAsCustomer(): Promise<Booking[]> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      service:services(id, title, price, location),
      provider:profiles!bookings_provider_id_fkey(id, full_name, avatar_url)
    `)
    .eq('customer_id', session.user.id)
    .order('booking_date', { ascending: false });

  if (error) throw error;
  return (data as Booking[]) ?? [];
}

export async function getMyBookingsAsProvider(): Promise<Booking[]> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      service:services(id, title, price, location),
      customer:profiles!bookings_customer_id_fkey(id, full_name, avatar_url)
    `)
    .eq('provider_id', session.user.id)
    .order('booking_date', { ascending: false });

  if (error) throw error;
  return (data as Booking[]) ?? [];
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<Booking> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Booking;
}
