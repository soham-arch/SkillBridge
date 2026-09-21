'use client';

import { DayPicker } from 'react-day-picker';
import { format, addDays } from 'date-fns';
import type { AvailabilitySlot } from '@/types';

interface BookingCalendarProps {
  selectedDate: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  availableSlots: AvailabilitySlot[];
}

export function BookingCalendar({ selectedDate, onSelect, availableSlots }: BookingCalendarProps) {
  // Build a set of available days of week (0-6)
  const availableDays = new Set(availableSlots.map((s) => s.day_of_week));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = addDays(today, 30);

  // Disable dates that don't have availability slots or are in the past
  function isDateDisabled(date: Date): boolean {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d < today) return true;
    if (d > maxDate) return true;
    const dow = d.getDay();
    return !availableDays.has(dow);
  }

  return (
    <div className="booking-calendar">
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={onSelect}
        disabled={isDateDisabled}
        fromDate={today}
        toDate={maxDate}
        showOutsideDays={false}
        modifiersClassNames={{
          selected: 'rdp-day-selected',
          today: 'rdp-day-today',
          disabled: 'rdp-day-disabled',
        }}
        formatters={{
          formatCaption: (date) => format(date, 'MMMM yyyy'),
        }}
      />
      <style jsx global>{`
        .booking-calendar {
          display: flex;
          justify-content: center;
        }
        .booking-calendar .rdp {
          --rdp-cell-size: 44px;
          --rdp-accent-color: #004ac6;
          --rdp-background-color: #f0f4ff;
          margin: 0;
        }
        .booking-calendar .rdp-months {
          display: flex;
          justify-content: center;
        }
        .booking-calendar .rdp-month {
          margin: 0;
        }
        .booking-calendar .rdp-caption {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px;
          margin-bottom: 12px;
        }
        .booking-calendar .rdp-caption_label {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a2e;
        }
        .booking-calendar .rdp-nav {
          display: flex;
          gap: 4px;
        }
        .booking-calendar .rdp-nav_button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #c3c6d7;
          background: white;
          color: #555;
          cursor: pointer;
          transition: all 0.15s;
        }
        .booking-calendar .rdp-nav_button:hover {
          background: #f0f4ff;
          border-color: #004ac6;
          color: #004ac6;
        }
        .booking-calendar .rdp-head_cell {
          font-size: 12px;
          font-weight: 600;
          color: #737686;
          text-transform: uppercase;
          padding: 8px 0;
        }
        .booking-calendar .rdp-tbody {
          font-size: 14px;
        }
        .booking-calendar .rdp-cell {
          padding: 2px;
        }
        .booking-calendar .rdp-day {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          font-weight: 500;
          color: #1a1a2e;
          border: none;
          background: transparent;
        }
        .booking-calendar .rdp-day:hover:not(.rdp-day-selected):not(.rdp-day-disabled) {
          background: #f0f4ff;
          color: #004ac6;
        }
        .booking-calendar .rdp-day-selected {
          background: #004ac6 !important;
          color: white !important;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0, 74, 198, 0.3);
        }
        .booking-calendar .rdp-day-today:not(.rdp-day-selected) {
          font-weight: 700;
          color: #004ac6;
          position: relative;
        }
        .booking-calendar .rdp-day-today:not(.rdp-day-selected)::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #004ac6;
        }
        .booking-calendar .rdp-day-disabled {
          color: #c3c6d7 !important;
          cursor: not-allowed;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
