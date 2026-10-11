'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Clock, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BookingCalendar } from '@/components/booking/booking-calendar';
import { TimeSlotPicker } from '@/components/booking/time-slot-picker';
import { getAvailabilitySlots, getBookingsForDate } from '@/lib/services/bookings';
import { bookConsultationOrder } from '@/lib/services/orders';
import type { Service, AvailabilitySlot } from '@/types';

interface BookingModalProps {
  service: Service;
  customerId: string;
  open: boolean;
  onClose: () => void;
}

type Step = 'date' | 'time' | 'confirm';

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export function BookingModal({ service, customerId, open, onClose }: BookingModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('date');
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<{ start_time: string; end_time: string } | null>(null);
  const [note, setNote] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  // Time slots for the selected date
  const [timeSlots, setTimeSlots] = useState<
    { start_time: string; end_time: string; isBooked: boolean }[]
  >([]);

  // Load provider availability on open
  useEffect(() => {
    if (!open || !service.provider_id) return;
    setLoadingAvailability(true);
    getAvailabilitySlots(service.provider_id)
      .then(setAvailabilitySlots)
      .catch(console.error)
      .finally(() => setLoadingAvailability(false));
  }, [open, service.provider_id]);

  // When date is selected, load booked slots for that date
  const loadTimeSlotsForDate = useCallback(
    async (date: Date) => {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOfWeek = date.getDay();

        // Get available slots for this day of week
        const daySlots = availabilitySlots.filter((s) => s.day_of_week === dayOfWeek);

        // Get existing bookings for this date
        const existingBookings = await getBookingsForDate(service.provider_id, dateStr);
        const bookedTimes = new Set(existingBookings.map((b) => b.start_time));

        setTimeSlots(
          daySlots.map((s) => ({
            start_time: s.start_time,
            end_time: s.end_time,
            isBooked: bookedTimes.has(s.start_time),
          }))
        );
      } catch (err) {
        console.error(err);
        setTimeSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    [availabilitySlots, service.provider_id]
  );

  function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date);
    if (date) {
      loadTimeSlotsForDate(date);
      setStep('time');
    }
  }

  function handleSlotSelect(slot: { start_time: string; end_time: string }) {
    setSelectedSlot(slot);
    setStep('confirm');
  }

  async function handleConfirm() {
    if (!selectedDate || !selectedSlot) return;

    setSubmitting(true);
    try {
      const { order } = await bookConsultationOrder({
        serviceId: service.id,
        buyerId: customerId,
        bookingDate: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedSlot.start_time,
        endTime: selectedSlot.end_time,
        note: note.trim(),
        paymentMethod: 'upi',
        paymentSuccess: true,
      });
      toast.success('Consultation session confirmed & order created! 🎉');
      onClose();
      router.push(`/orders/${order.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Booking failed. Please try again.';
      toast.error(message);
      // If slot was taken, go back to time selection
      if (message.includes('already been booked') || message.includes('not available')) {
        setStep('time');
        if (selectedDate) loadTimeSlotsForDate(selectedDate);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (step === 'confirm') setStep('time');
    else if (step === 'time') {
      setStep('date');
      setSelectedSlot(null);
    }
  }

  function resetAndClose() {
    setStep('date');
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setNote('');
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={resetAndClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 flex w-full max-w-lg flex-col rounded-2xl border border-border bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            {step !== 'date' && (
              <button
                onClick={handleBack}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c3c6d7] text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'date' && 'Select a Date'}
              {step === 'time' && 'Choose a Time Slot'}
              {step === 'confirm' && 'Confirm Booking'}
            </h2>
          </div>
          <button
            onClick={resetAndClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {(['date', 'time', 'confirm'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step === s
                    ? 'bg-[#004ac6] text-white shadow-sm'
                    : i < ['date', 'time', 'confirm'].indexOf(step)
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i < ['date', 'time', 'confirm'].indexOf(step) ? '✓' : i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`h-0.5 w-8 rounded-full transition-colors ${
                    i < ['date', 'time', 'confirm'].indexOf(step) ? 'bg-emerald-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
          <span className="ml-2 text-xs text-gray-400">
            {step === 'date' && 'Pick a date'}
            {step === 'time' && 'Pick a time'}
            {step === 'confirm' && 'Review & confirm'}
          </span>
        </div>

        {/* Service info bar */}
        <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl bg-[#f8faff] px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0f4ff]">
            <Calendar className="h-5 w-5 text-[#004ac6]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{service.title}</p>
            <p className="text-xs text-gray-500">
              ₹{service.price.toLocaleString('en-IN')}
              {service.provider?.full_name && ` · ${service.provider.full_name}`}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loadingAvailability ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#004ac6]" />
            </div>
          ) : availabilitySlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#c3c6d7] bg-white py-10 text-center">
              <Clock className="mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">No availability set</p>
              <p className="mt-1 text-xs text-gray-400">
                This provider hasn't set up their availability yet.
              </p>
            </div>
          ) : (
            <>
              {step === 'date' && (
                <BookingCalendar
                  selectedDate={selectedDate}
                  onSelect={handleDateSelect}
                  availableSlots={availabilitySlots}
                />
              )}

              {step === 'time' && selectedDate && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                    <Calendar className="h-4 w-4 text-[#004ac6]" />
                    <span className="text-sm font-medium text-gray-700">
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                  <TimeSlotPicker
                    slots={timeSlots}
                    selectedSlot={selectedSlot}
                    onSelect={handleSlotSelect}
                    loading={loadingSlots}
                  />
                </div>
              )}

              {step === 'confirm' && selectedDate && selectedSlot && (
                <div className="space-y-5">
                  {/* Summary */}
                  <div className="space-y-3 rounded-xl border border-border bg-white p-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Booking Summary
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" /> Date
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {format(selectedDate, 'EEE, MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" /> Time
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatTime(selectedSlot.start_time)} — {formatTime(selectedSlot.end_time)}
                        </span>
                      </div>
                      <div className="border-t border-dashed border-gray-200 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Total</span>
                          <span className="text-lg font-bold text-[#004ac6]">
                            ₹{service.price.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Note to provider{' '}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Anything the provider should know before the session..."
                      rows={3}
                      className="resize-none rounded-lg border-[#c3c6d7] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-[#737686] focus-visible:ring-1 focus-visible:ring-[#004ac6]"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {step === 'confirm' && selectedSlot && (
          <div className="border-t border-border px-6 py-4">
            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full gap-2 bg-[#004ac6] py-3 text-white hover:bg-[#003b9e] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Booking
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
