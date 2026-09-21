'use client';

import { Clock } from 'lucide-react';

interface TimeSlot {
  start_time: string;
  end_time: string;
  isBooked: boolean;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: { start_time: string; end_time: string } | null;
  onSelect: (slot: { start_time: string; end_time: string }) => void;
  loading?: boolean;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export function TimeSlotPicker({ slots, selectedSlot, onSelect, loading }: TimeSlotPickerProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[60px] animate-pulse rounded-xl border border-border bg-gray-50" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#c3c6d7] bg-white py-10 text-center">
        <Clock className="mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm font-semibold text-gray-600">No time slots available</p>
        <p className="mt-1 text-xs text-gray-400">Try selecting a different date.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {slots.map((slot) => {
        const isSelected =
          selectedSlot?.start_time === slot.start_time &&
          selectedSlot?.end_time === slot.end_time;

        return (
          <button
            key={`${slot.start_time}-${slot.end_time}`}
            disabled={slot.isBooked}
            onClick={() => onSelect({ start_time: slot.start_time, end_time: slot.end_time })}
            className={`
              relative flex flex-col items-center justify-center rounded-xl border-2 px-3 py-3
              text-sm font-medium transition-all duration-150
              ${
                slot.isBooked
                  ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 line-through'
                  : isSelected
                  ? 'border-[#004ac6] bg-[#f0f4ff] text-[#004ac6] shadow-sm ring-1 ring-[#004ac6]/20'
                  : 'cursor-pointer border-[#c3c6d7] bg-white text-gray-700 hover:border-[#004ac6]/50 hover:bg-[#f8faff]'
              }
            `}
          >
            <span className="text-[13px] font-semibold">
              {formatTime(slot.start_time)}
            </span>
            <span className="text-[11px] text-gray-400 font-normal">
              to {formatTime(slot.end_time)}
            </span>
            {slot.isBooked && (
              <span className="absolute -top-2 -right-2 rounded-full bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold text-gray-500 uppercase">
                Booked
              </span>
            )}
            {isSelected && !slot.isBooked && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#004ac6] text-white">
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
