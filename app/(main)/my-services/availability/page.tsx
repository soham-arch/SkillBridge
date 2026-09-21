'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { useAuth } from '@/lib/auth/auth-context';
import {
  getMyAvailabilitySlots,
  upsertAvailabilitySlot,
  deleteAvailabilitySlot,
} from '@/lib/services/bookings';
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
      toast.error('This slot already exists.');
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
      toast.success('Slot added!');
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
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
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
    <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Availability</h1>
        <p className="mt-2 text-gray-600">
          Set your weekly time slots so students can book sessions with you.
        </p>
      </div>

      {/* Add slot form */}
      <div className="mb-8 rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Add a Time Slot
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Day</label>
            <select
              value={newDay}
              onChange={(e) => setNewDay(Number(e.target.value))}
              className="h-[46px] rounded-lg border border-[#c3c6d7] bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Start</label>
            <select
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="h-[46px] rounded-lg border border-[#c3c6d7] bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {formatTime(t + ':00')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">End</label>
            <select
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="h-[46px] rounded-lg border border-[#c3c6d7] bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
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
            className="gap-2 bg-[#004ac6] text-white hover:bg-[#003b9e] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Add Slot
          </Button>
        </div>
      </div>

      {/* Existing slots */}
      {slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#c3c6d7] bg-white py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f4ff]">
            <Clock className="h-8 w-8 text-[#004ac6]" />
          </div>
          <p className="text-lg font-semibold text-gray-700">No availability slots yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Add time slots above so students can book sessions with you.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {DAYS.map((day) => {
            const daySlots = slotsByDay[day.value];
            if (!daySlots || daySlots.length === 0) return null;

            return (
              <div key={day.value} className="rounded-xl border border-border bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-gray-900">{day.label}</h3>
                <div className="flex flex-wrap gap-2">
                  {daySlots
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center gap-2 rounded-lg border border-[#c3c6d7] bg-[#fafafa] px-3 py-2"
                      >
                        <Clock className="h-3.5 w-3.5 text-[#004ac6]" />
                        <span className="text-sm font-medium text-gray-700">
                          {formatTime(slot.start_time)} — {formatTime(slot.end_time)}
                        </span>
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
