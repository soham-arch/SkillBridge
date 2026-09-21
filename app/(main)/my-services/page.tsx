'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { getMyServices } from '@/lib/services/services';
import type { Service } from '@/types';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700',
  archived: 'bg-red-50 text-red-600',
};

export default function MyServicesPage() {
  const { loading: authLoading } = useRequireAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyServices()
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (authLoading || loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
      {/* Heading */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Services</h1>
          <p className="mt-2 text-gray-600">Manage your skill offerings.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/my-services/availability">
            <Button
              variant="outline"
              className="gap-2 border-[#c3c6d7] text-gray-700 hover:bg-gray-50"
            >
              <Clock className="h-4 w-4" />
              Manage Availability
            </Button>
          </Link>
          <Link href="/services/create">
            <Button className="gap-2 bg-[#004ac6] text-white hover:bg-[#003b9e]">
              <PlusCircle className="h-4 w-4" />
              New Service
            </Button>
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#c3c6d7] bg-white py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f4ff]">
            <PlusCircle className="h-8 w-8 text-[#004ac6]" />
          </div>
          <p className="text-lg font-semibold text-gray-700">No services yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Create your first listing to start offering your skills.
          </p>
          <Link href="/services/create">
            <Button className="mt-6 gap-2 bg-[#004ac6] text-white hover:bg-[#003b9e]">
              <PlusCircle className="h-4 w-4" />
              Create Service
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {services.map((svc) => (
            <div key={svc.id} className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {svc.category && (
                    <Badge
                      variant="secondary"
                      className="mb-2 rounded-full bg-[#f0f4ff] px-3 py-0.5 text-xs font-semibold text-[#004ac6]"
                    >
                      {svc.category.name}
                    </Badge>
                  )}
                  <h3 className="text-base font-semibold text-gray-900">{svc.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{svc.description}</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    ₹{svc.price.toLocaleString('en-IN')}
                    {svc.location && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        · {svc.location}
                      </span>
                    )}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    STATUS_STYLES[svc.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {svc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}