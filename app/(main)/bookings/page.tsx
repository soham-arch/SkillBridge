'use client';

import { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, XCircle } from 'lucide-react';
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
  confirmed: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
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
      // Refresh
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  const items = tab === 'customer' ? customerBookings : providerBookings;

  return (
    <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <p className="mt-2 text-gray-600">Track your scheduled sessions.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex w-fit gap-1 rounded-xl border border-border bg-white p-1 shadow-sm">
        {(['customer', 'provider'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
              tab === t
                ? 'bg-[#004ac6] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#c3c6d7] bg-white py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f4ff]">
            <Calendar className="h-8 w-8 text-[#004ac6]" />
          </div>
          <p className="text-lg font-semibold text-gray-700">
            {tab === 'customer' ? 'No bookings yet' : 'No client bookings yet'}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {tab === 'customer'
              ? 'Explore services and book your first session.'
              : 'Set up your availability to start receiving bookings.'}
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
              : '?';

            const isFuture =
              new Date(booking.booking_date) >= new Date(new Date().toDateString());
            const canCancel = booking.status === 'confirmed' && isFuture;
            const canComplete =
              tab === 'provider' && booking.status === 'confirmed';

            return (
              <div
                key={booking.id}
                className="rounded-xl border border-border bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-10 w-10 shrink-0 border border-[#c3c6d7]">
                      {otherParty?.avatar_url ? (
                        <AvatarImage src={otherParty.avatar_url} alt="" />
                      ) : null}
                      <AvatarFallback className="text-xs font-semibold text-[#004ac6]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-gray-900">
                        {booking.service?.title ?? 'Service'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tab === 'customer' ? 'with' : 'by'}{' '}
                        {otherParty?.full_name ?? 'Unknown'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(booking.booking_date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span>
                          {formatTime(booking.start_time)} — {formatTime(booking.end_time)}
                        </span>
                      </div>
                      {booking.note && (
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                          &quot;{booking.note}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        STATUS_STYLES[booking.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {booking.status}
                    </span>
                    {booking.service?.price != null && (
                      <span className="text-sm font-bold text-[#004ac6]">
                        ₹{Number(booking.service.price).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {(canCancel || canComplete) && (
                  <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3">
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === booking.id}
                        onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                        className="gap-1.5 border-[#c3c6d7] text-gray-600 hover:border-red-300 hover:text-red-600"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    )}
                    {canComplete && (
                      <Button
                        size="sm"
                        disabled={actionLoading === booking.id}
                        onClick={() => handleStatusUpdate(booking.id, 'completed')}
                        className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
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
