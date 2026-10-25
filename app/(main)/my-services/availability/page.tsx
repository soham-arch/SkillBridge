'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Trash2, Clock, Calendar, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { useAuth } from '@/lib/auth/auth-context';
import {
  getMyAvailabilitySlots,
  upsertAvailabilitySlot,
  deleteAvailabilitySlot,
} from '@/lib/services/bookings';
import { Reveal } from '@/components/motion/reveal';
import { editorialEase } from '@/components/motion/motion-tokens';
import type { AvailabilitySlot } from '@/types';

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 21; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:00`);
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export default function AvailabilityPage() {
  const { loading: authLoading } = useRequireAuth();
  const { session } = useAuth();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New slot form
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('10:00');

  useEffect(() => {
    getMyAvailabilitySlots()
      .then(setSlots)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleAddSlot() {
    if (!session?.user?.id) return;
    if (newStart >= newEnd) {
      toast.error('End time must be after start time.');
      return;
    }

    // Check duplicate
    const dup = slots.find(
      (s) =>
        s.day_of_week === newDay &&
        s.start_time === newStart + ':00' &&
        s.end_time === newEnd + ':00'
    );
    if (dup) {
      toast.error('This slot already exists in your weekly schedule.');
      return;
    }

    setSaving(true);
    try {
      const created = await upsertAvailabilitySlot({
        provider_id: session.user.id,
        service_id: null,
        day_of_week: newDay,
        start_time: newStart,
        end_time: newEnd,
        is_active: true,
      });
      setSlots((prev) => [...prev, created]);
      toast.success('Availability window added successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add slot.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSlot(id: string) {
    try {
      await deleteAvailabilitySlot(id);
      setSlots((prev) => prev.filter((s) => s.id !== id));
      toast.success('Slot removed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove slot.';
      toast.error(msg);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-20 animate-pulse">
        <div className="h-4 w-32 bg-neutral-200 rounded mb-8" />
        <div className="h-8 w-64 bg-neutral-200 rounded mb-4" />
        <div className="h-40 bg-neutral-200/60 rounded-3xl mb-8" />
      </div>
    );
  }

  // Group slots by day
  const slotsByDay: Record<number, AvailabilitySlot[]> = {};
  for (const slot of slots) {
    if (!slotsByDay[slot.day_of_week]) slotsByDay[slot.day_of_week] = [];
    slotsByDay[slot.day_of_week].push(slot);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Back Link */}
      <Reveal>
        <div className="mb-6">
          <Link
            href="/my-services"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Back to My Services
          </Link>
        </div>
      </Reveal>

      {/* Heading */}
      <Reveal>
        <div className="mb-8 border-b border-neutral-100 pb-6">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#004ac6]">
            Consultation Scheduling
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight mt-1">
            Weekly Availability Windows
          </h1>
          <p className="mt-1 text-xs text-neutral-500 max-w-xl">
            Configure your recurring weekly calendar slots so campus peers can book mentorship, assignment reviews, or 1-on-1 tutoring sessions with you.
          </p>
        </div>
      </Reveal>

      {/* Add slot card */}
      <Reveal>
        <div className="mb-10 rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-4">
            Add Weekly Recurrence Slot
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Weekday
              </label>
              <select
                value={newDay}
                onChange={(e) => setNewDay(Number(e.target.value))}
                className="h-11 rounded-xl border border-neutral-300 bg-white px-3 text-xs text-neutral-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Start Time
              </label>
              <select
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="h-11 rounded-xl border border-neutral-300 bg-white px-3 text-xs text-neutral-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {formatTime(t + ':00')}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                End Time
              </label>
              <select
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="h-11 rounded-xl border border-neutral-300 bg-white px-3 text-xs text-neutral-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {formatTime(t + ':00')}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleAddSlot}
              disabled={saving}
              className="gap-2 bg-neutral-900 text-white hover:bg-[#004ac6] text-xs font-bold rounded-full h-11 px-6 shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              {saving ? 'Adding...' : 'Add Slot'}
            </Button>
          </div>
        </div>
      </Reveal>

      {/* Existing slots */}
      {slots.length === 0 ? (
        <Reveal>
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-white py-16 px-6 text-center shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600">
              <Clock className="h-8 w-8 text-[#004ac6]" />
            </div>
            <p className="text-lg font-bold text-neutral-900">No Availability Windows Defined</p>
            <p className="mt-1 text-xs text-neutral-500 max-w-sm">
              Add recurring morning or evening time slots above so clients can book consultations with you.
            </p>
          </div>
        </Reveal>
      ) : (
        <div className="space-y-4">
          {DAYS.map((day) => {
            const daySlots = slotsByDay[day.value];
            if (!daySlots || daySlots.length === 0) return null;

            return (
              <Reveal key={day.value}>
                <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                      {day.label}
                    </h3>
                    <span className="text-[11px] font-semibold text-neutral-400">
                      {daySlots.length} window{daySlots.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {daySlots
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((slot) => (
                        <div
                          key={slot.id}
                          className="group flex items-center gap-2.5 rounded-full border border-neutral-200 bg-neutral-50/70 px-4 py-2 hover:border-neutral-300 transition-all"
                        >
                          <Clock className="h-3.5 w-3.5 text-[#004ac6]" />
                          <span className="text-xs font-semibold text-neutral-800">
                            {formatTime(slot.start_time)} — {formatTime(slot.end_time)}
                          </span>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            title="Remove Slot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
