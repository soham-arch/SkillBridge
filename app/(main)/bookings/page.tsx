'use client';

import { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import {
  getMyBookingsAsCustomer,
  getMyBookingsAsProvider,
  updateBookingStatus,
} from '@/lib/services/bookings';
import { toast } from 'sonner';
import type { Booking } from '@/types';

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-blue-50 text-[#004ac6] border border-blue-200',
  completed: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  cancelled: 'bg-neutral-100 text-neutral-500 border border-neutral-200',
};

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export default function BookingsPage() {
  const { loading: authLoading } = useRequireAuth();
  const [tab, setTab] = useState<'customer' | 'provider'>('customer');
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [providerBookings, setProviderBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getMyBookingsAsCustomer(), getMyBookingsAsProvider()])
      .then(([cust, prov]) => {
        setCustomerBookings(cust);
        setProviderBookings(prov);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleStatusUpdate(id: string, status: 'cancelled' | 'completed') {
    setActionLoading(id);
    try {
      await updateBookingStatus(id, status);
      toast.success(status === 'cancelled' ? 'Booking cancelled.' : 'Booking marked as completed!');
      const [cust, prov] = await Promise.all([
        getMyBookingsAsCustomer(),
        getMyBookingsAsProvider(),
      ]);
      setCustomerBookings(cust);
      setProviderBookings(prov);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed.';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
      </div>
    );
  }

  const items = tab === 'customer' ? customerBookings : providerBookings;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12 py-12 sm:py-16">
      {/* Editorial Header */}
      <div className="mb-10 pb-8 border-b border-neutral-200/80">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#004ac6]">
          // Live Calendar & Consultations
        </span>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-950 mt-1">
          My Bookings.
        </h1>
        <p className="mt-2 text-sm text-neutral-500 font-normal">
          Track scheduled tutoring sessions, 1-on-1 code reviews, and design critiques.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex w-fit gap-1 rounded-2xl border border-neutral-200 bg-white p-1 shadow-2xs">
        {(['customer', 'provider'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              tab === t
                ? 'bg-neutral-950 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {t === 'customer'
              ? `Booked by Me (${customerBookings.length})`
              : `My Clients (${providerBookings.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-200 bg-white py-24 text-center px-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
            <Calendar className="h-6 w-6" />
          </div>
          <p className="text-xl font-bold text-neutral-950">
            {tab === 'customer' ? 'No bookings scheduled yet' : 'No client bookings yet'}
          </p>
          <p className="mt-2 text-xs text-neutral-500 max-w-sm leading-relaxed">
            {tab === 'customer'
              ? 'Explore consultation services on the campus catalog and book your first 1-on-1 slot.'
              : 'Configure your calendar availability in seller studio to receive student bookings.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((booking) => {
            const otherParty =
              tab === 'customer' ? booking.provider : booking.customer;
            const initials = otherParty?.full_name
              ? otherParty.full_name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'SB';

            const isFuture =
              new Date(booking.booking_date) >= new Date(new Date().toDateString());
            const canCancel = booking.status === 'confirmed' && isFuture;
            const canComplete =
              tab === 'provider' && booking.status === 'confirmed';

            return (
              <div
                key={booking.id}
                className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-xs hover:border-neutral-900 transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-12 w-12 shrink-0 border border-neutral-200">
                      {otherParty?.avatar_url ? (
                        <AvatarImage src={otherParty.avatar_url} alt="" />
                      ) : null}
                      <AvatarFallback className="text-xs font-bold text-neutral-900 bg-neutral-100">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-neutral-950 leading-snug">
                        {booking.service?.title ?? 'Consultation Session'}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {tab === 'customer' ? 'Tutor / Mentor:' : 'Client:'}{' '}
                        <strong className="text-neutral-800">{otherParty?.full_name ?? 'Student Peer'}</strong>
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-neutral-600">
                        <span className="flex items-center gap-1.5 font-bold text-neutral-900">
                          <Calendar className="h-3.5 w-3.5 text-[#004ac6]" />
                          {new Date(booking.booking_date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5 font-mono">
                          <Clock className="h-3.5 w-3.5 text-neutral-400" />
                          {formatTime(booking.start_time)} — {formatTime(booking.end_time)}
                        </span>
                      </div>
                      {booking.note && (
                        <p className="mt-2 text-xs text-neutral-600 italic">
                          &ldquo;{booking.note}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        STATUS_STYLES[booking.status] ?? 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {booking.status}
                    </span>
                    {booking.service?.price != null && (
                      <span className="text-xl font-black text-neutral-950 font-mono">
                        ₹{Number(booking.service.price).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {(canCancel || canComplete) && (
                  <div className="mt-5 flex gap-2 border-t border-neutral-100 pt-4">
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === booking.id}
                        onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                        className="rounded-xl border-neutral-300 text-neutral-700 hover:border-red-300 hover:text-red-600 text-xs font-bold h-9 px-4"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Cancel Booking
                      </Button>
                    )}
                    {canComplete && (
                      <Button
                        size="sm"
                        disabled={actionLoading === booking.id}
                        onClick={() => handleStatusUpdate(booking.id, 'completed')}
                        className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold h-9 px-4"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Mark Completed
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
