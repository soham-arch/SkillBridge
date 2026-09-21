/*
# Atomic Booking RPC Function

Provides a Postgres function `book_service` that:
1. Validates the provider has an active availability slot for the requested day/time
2. Checks no existing confirmed booking conflicts on that date/time
3. Inserts the booking atomically
4. Returns the new booking row or raises an exception

This guarantees the same provider/time slot cannot be booked twice,
even under concurrent requests.
*/

CREATE OR REPLACE FUNCTION book_service(
  p_service_id uuid,
  p_customer_id uuid,
  p_provider_id uuid,
  p_booking_date date,
  p_start_time time,
  p_end_time time,
  p_note text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id uuid;
  v_day_of_week integer;
  v_slot_exists boolean;
  v_conflict_exists boolean;
BEGIN
  -- Validate: customer cannot book their own service
  IF p_customer_id = p_provider_id THEN
    RAISE EXCEPTION 'You cannot book your own service.';
  END IF;

  -- Validate: booking date must be today or in the future
  IF p_booking_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot book a date in the past.';
  END IF;

  -- Get the day of week (0=Sunday, 6=Saturday) for the requested date
  v_day_of_week := EXTRACT(DOW FROM p_booking_date)::integer;

  -- Check availability: provider must have an active slot for this day/time
  SELECT EXISTS (
    SELECT 1 FROM availability_slots
    WHERE provider_id = p_provider_id
      AND day_of_week = v_day_of_week
      AND start_time = p_start_time
      AND end_time = p_end_time
      AND is_active = true
      AND (service_id IS NULL OR service_id = p_service_id)
  ) INTO v_slot_exists;

  IF NOT v_slot_exists THEN
    RAISE EXCEPTION 'This time slot is not available.';
  END IF;

  -- Check for conflicting confirmed bookings (lock the row range to prevent races)
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE provider_id = p_provider_id
      AND booking_date = p_booking_date
      AND start_time = p_start_time
      AND status = 'confirmed'
    FOR UPDATE
  ) INTO v_conflict_exists;

  IF v_conflict_exists THEN
    RAISE EXCEPTION 'This time slot has already been booked. Please choose another.';
  END IF;

  -- Insert the booking
  INSERT INTO bookings (
    service_id,
    customer_id,
    provider_id,
    booking_date,
    start_time,
    end_time,
    status,
    note
  ) VALUES (
    p_service_id,
    p_customer_id,
    p_provider_id,
    p_booking_date,
    p_start_time,
    p_end_time,
    'confirmed',
    p_note
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;
