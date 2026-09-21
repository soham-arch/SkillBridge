'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { useAuth } from '@/lib/auth/auth-context';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { ServiceRequest } from '@/types';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  accepted: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-violet-50 text-violet-700',
  completed: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

type RequestWithService = ServiceRequest & { service?: { id: string; title: string; price: number; location: string | null } | null };

export default function RequestsPage() {
  const { loading: authLoading } = useRequireAuth();
  const { session } = useAuth();
  const [sent, setSent] = useState<RequestWithService[]>([]);
  const [received, setReceived] = useState<RequestWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'sent' | 'received'>('sent');

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const supabase = getSupabaseClient();
    setLoading(true);

    Promise.all([
      supabase
        .from('service_requests')
        .select('*, service:services(id, title, price, location)')
        .eq('customer_id', userId)
        .order('requested_at', { ascending: false }),
      supabase
        .from('service_requests')
        .select('*, service:services(id, title, price, location)')
        .eq('provider_id', userId)
        .order('requested_at', { ascending: false }),
    ])
      .then(([sentRes, recvRes]) => {
        setSent((sentRes.data as RequestWithService[]) ?? []);
        setReceived((recvRes.data as RequestWithService[]) ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  const items = tab === 'sent' ? sent : received;

  return (
    <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Requests</h1>
        <p className="mt-2 text-gray-600">Track service requests you've sent or received.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex w-fit gap-1 rounded-xl border border-border bg-white p-1 shadow-sm">
        {(['sent', 'received'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
              tab === t
                ? 'bg-[#004ac6] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t === 'sent' ? `Sent (${sent.length})` : `Received (${received.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#c3c6d7] bg-white py-20 text-center">
          <p className="text-lg font-semibold text-gray-700">No {tab} requests yet</p>
          <p className="mt-2 text-sm text-gray-500">
            {tab === 'sent'
              ? 'Explore services and send your first request.'
              : 'Share your service listing to start receiving requests.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((req) => (
            <div key={req.id} className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-base font-semibold text-gray-900">
                    {req.service?.title ?? 'Service'}
                  </p>
                  {req.message && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{req.message}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    {new Date(req.requested_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    STATUS_STYLES[req.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {req.status.replace('_', ' ')}
                </span>
              </div>
              {req.service?.price != null && (
                <p className="mt-3 text-sm font-semibold text-[#004ac6]">
                  ₹{Number(req.service.price).toLocaleString('en-IN')}
                  {req.service.location && (
                    <span className="ml-2 font-normal text-gray-500">· {req.service.location}</span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
