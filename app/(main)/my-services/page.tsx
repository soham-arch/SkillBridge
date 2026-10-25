'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PlusCircle,
  Clock,
  Edit3,
  Pause,
  Play,
  Archive,
  Trash2,
  ExternalLink,
  Search,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth/auth-context';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import {
  getMyServices,
  changeServiceStatus,
  deleteService,
} from '@/lib/services/services';
import type { Service, ServiceStatus } from '@/types';

const STATUS_CONFIG: Record<
  ServiceStatus,
  { label: string; badgeClass: string; description: string }
> = {
  published: {
    label: 'Published',
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    description: 'Active and discoverable across campus search & AI.',
  },
  paused: {
    label: 'Paused',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
    description: 'Temporarily paused. Hidden from search; not taking new orders.',
  },
  draft: {
    label: 'Draft',
    badgeClass: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
    description: 'Unpublished draft. Only visible to you until published.',
  },
  archived: {
    label: 'Archived',
    badgeClass: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
    description: 'Deactivated listing. Retains historical order links.',
  },
  moderated: {
    label: 'Moderated',
    badgeClass: 'bg-red-50 text-red-700 border border-red-200',
    description: 'Temporarily held under administrative review.',
  },
};

type TabFilter = 'all' | 'published' | 'paused' | 'draft' | 'archived';

export default function MyServicesPage() {
  const { loading: authLoading } = useRequireAuth();
  const { isSeller, isAdmin, user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteBlockedError, setDeleteBlockedError] = useState<string | null>(null);

  // Status toggle state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function loadServices() {
    try {
      const data = await getMyServices();
      setServices(data);
    } catch (err) {
      console.error('Failed to load seller services:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  // Filtered listings
  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      if (activeTab !== 'all' && svc.status !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = svc.title.toLowerCase().includes(q);
        const matchesDesc = svc.description.toLowerCase().includes(q);
        const matchesCat = svc.category?.name.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCat) {
          return false;
        }
      }
      return true;
    });
  }, [services, activeTab, searchQuery]);

  async function handleStatusChange(service: Service, newStatus: ServiceStatus) {
    setTogglingId(service.id);
    try {
      await changeServiceStatus(service.id, newStatus, user?.id);

      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, status: newStatus } : s))
      );

      const statusLabels: Record<string, string> = {
        published: 'Listing resumed and discoverable!',
        paused: 'Listing paused. Hidden from search discovery.',
        archived: 'Listing archived.',
      };
      toast.success(statusLabels[newStatus] || `Status updated to ${newStatus}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change listing status';
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmSafeDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteBlockedError(null);
    try {
      await deleteService(deleteTarget.id, user?.id);

      setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success(`"${deleteTarget.title}" deleted permanently.`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete listing.';
      setDeleteBlockedError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
      </div>
    );
  }

  const counts = {
    all: services.length,
    published: services.filter((s) => s.status === 'published').length,
    paused: services.filter((s) => s.status === 'paused').length,
    draft: services.filter((s) => s.status === 'draft').length,
    archived: services.filter((s) => s.status === 'archived').length,
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12 py-12 sm:py-16">
      {/* Editorial Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#004ac6]">
              // Seller Studio Catalog
            </span>
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-mono font-bold text-neutral-600">
              {services.length} Total
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-950">
            My Services.
          </h1>
          <p className="mt-2 text-sm text-neutral-500 font-normal">
            Manage your service offerings, turnaround times, and pricing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/my-services/availability">
            <Button
              variant="outline"
              className="rounded-xl border-neutral-300 text-xs font-bold text-neutral-800 hover:bg-neutral-50 h-11 px-4 shadow-2xs"
            >
              <Clock className="h-4 w-4 mr-1.5" />
              Calendar Availability
            </Button>
          </Link>
          <Link href="/services/create">
            <Button className="rounded-xl bg-neutral-950 text-white hover:bg-black font-bold text-xs h-11 px-5 shadow-xs">
              <PlusCircle className="h-4 w-4 mr-2" />
              Offer New Skill
            </Button>
          </Link>
        </div>
      </div>

      {/* Buyer notice if role not yet activated */}
      {!isAdmin && !isSeller && (
        <div className="mb-8 flex items-center justify-between gap-4 rounded-3xl border border-blue-200/80 bg-blue-50/50 p-6 shadow-2xs">
          <div>
            <h4 className="text-sm font-bold text-neutral-950">You are currently in Buyer mode</h4>
            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
              Enable your Seller role in profile settings to publish listings and monetize your skills across campus.
            </p>
          </div>
          <Link href="/profile?tab=roles">
            <Button size="sm" className="bg-neutral-950 text-white hover:bg-black font-bold text-xs rounded-xl h-10 px-4">
              Enable Seller Role
            </Button>
          </Link>
        </div>
      )}

      {/* Metrics Row */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-6 shadow-xs">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
            Published
          </span>
          <p className="text-3xl font-black text-emerald-700 font-mono mt-1">{counts.published}</p>
        </div>
        <div className="rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-6 shadow-xs">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
            Paused
          </span>
          <p className="text-3xl font-black text-amber-700 font-mono mt-1">{counts.paused}</p>
        </div>
        <div className="rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-6 shadow-xs">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
            Drafts
          </span>
          <p className="text-3xl font-black text-neutral-600 font-mono mt-1">{counts.draft}</p>
        </div>
        <div className="rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-6 shadow-xs">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
            Archived
          </span>
          <p className="text-3xl font-black text-neutral-400 font-mono mt-1">{counts.archived}</p>
        </div>
      </div>

      {/* Controls: Tabs & Search */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-neutral-200/80">
        {/* Tab Pills */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'all', label: `All (${counts.all})` },
              { id: 'published', label: `Published (${counts.published})` },
              { id: 'paused', label: `Paused (${counts.paused})` },
              { id: 'draft', label: `Drafts (${counts.draft})` },
              { id: 'archived', label: `Archived (${counts.archived})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-neutral-950 text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your listings..."
            className="h-10 pl-9 text-xs rounded-xl border-neutral-200 bg-white"
          />
        </div>
      </div>

      {/* Listings List */}
      {filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-200 bg-white py-20 text-center px-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
            <PlusCircle className="h-6 w-6" />
          </div>
          <p className="text-lg font-bold text-neutral-950">
            {services.length === 0 ? 'No listings created yet' : 'No matching listings found'}
          </p>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm leading-relaxed">
            {services.length === 0
              ? 'Publish your first skill listing to offer development, design, tutoring, or content services to fellow students.'
              : 'Try clearing your search query or selecting a different status filter above.'}
          </p>
          {services.length === 0 && (
            <Link href="/services/create">
              <Button className="mt-6 gap-2 rounded-xl bg-neutral-950 text-white hover:bg-black text-xs font-bold h-11 px-6">
                <PlusCircle className="h-4 w-4" />
                Offer Your First Skill
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredServices.map((svc) => {
            const config = STATUS_CONFIG[svc.status] || STATUS_CONFIG.draft;
            const isToggling = togglingId === svc.id;

            return (
              <div
                key={svc.id}
                className="group rounded-3xl border border-neutral-200 bg-white p-7 shadow-xs hover:border-neutral-900 transition-all duration-300"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left: Metadata */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {svc.category && (
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-mono font-bold text-neutral-700">
                          {svc.category.name}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${config.badgeClass}`}
                      >
                        {config.label}
                      </span>
                      {svc.service_type && (
                        <span className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] capitalize text-neutral-600">
                          {svc.service_type.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-neutral-950 group-hover:text-[#004ac6] transition-colors leading-snug">
                      {svc.title}
                    </h3>
                    <p className="line-clamp-2 text-xs text-neutral-600 leading-relaxed font-normal">
                      {svc.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-500 pt-1">
                      <span className="font-black text-neutral-950 text-base font-mono">
                        ₹{svc.price.toLocaleString('en-IN')}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-neutral-400" />
                        {svc.delivery_days || 3} days turnaround
                      </span>
                      {svc.completed_orders_count !== undefined && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="h-3.5 w-3.5 text-neutral-400" />
                            {svc.completed_orders_count} completed orders
                          </span>
                        </>
                      )}
                      {svc.location && (
                        <>
                          <span>•</span>
                          <span>{svc.location}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Lifecycle Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 shrink-0">
                    {/* View / Preview */}
                    <Link href={`/services/${svc.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 gap-1.5 rounded-xl border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Preview
                      </Button>
                    </Link>

                    {/* Edit */}
                    <Link href={`/services/${svc.id}/edit`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 gap-1.5 rounded-xl border-neutral-200 text-xs font-bold text-neutral-800 hover:bg-neutral-50"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </Link>

                    {/* Pause / Resume */}
                    {svc.status === 'published' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isToggling}
                        onClick={() => handleStatusChange(svc, 'paused')}
                        className="h-10 gap-1.5 rounded-xl border-amber-200 bg-amber-50/50 text-xs font-bold text-amber-800 hover:bg-amber-100"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        Pause
                      </Button>
                    )}
                    {svc.status === 'paused' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isToggling}
                        onClick={() => handleStatusChange(svc, 'published')}
                        className="h-10 gap-1.5 rounded-xl border-emerald-200 bg-emerald-50/50 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Resume
                      </Button>
                    )}
                    {svc.status === 'draft' && (
                      <Button
                        size="sm"
                        disabled={isToggling}
                        onClick={() => handleStatusChange(svc, 'published')}
                        className="h-10 gap-1.5 rounded-xl bg-neutral-950 text-white hover:bg-black text-xs font-bold"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Publish
                      </Button>
                    )}

                    {/* Archive */}
                    {svc.status !== 'archived' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isToggling}
                        onClick={() => handleStatusChange(svc, 'archived')}
                        className="h-10 gap-1.5 rounded-xl border-neutral-200 text-xs text-neutral-500 hover:bg-neutral-100"
                        title="Archive listing"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </Button>
                    )}

                    {/* Delete */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDeleteBlockedError(null);
                        setDeleteTarget(svc);
                      }}
                      className="h-10 gap-1.5 rounded-xl border-red-200 text-xs text-red-600 hover:bg-red-50"
                      title="Delete listing (safe check)"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Safe Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteBlockedError(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl bg-white p-8 shadow-2xl">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-neutral-950">
              Delete Service Listing?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-neutral-500 mt-1">
              You are about to delete &ldquo;{deleteTarget?.title}&rdquo;.
            </DialogDescription>
          </DialogHeader>

          {deleteBlockedError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                Historical Order Preservation Active
              </p>
              <p className="leading-relaxed">{deleteBlockedError}</p>
              <p className="text-[11px] text-amber-700">
                You can safely <strong>archive</strong> or <strong>pause</strong> the listing instead. This hides it from campus discovery while retaining student order history.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-xs text-neutral-600 space-y-1.5 leading-relaxed">
              <p>
                <strong>Safe Deletion Check:</strong> If this service has past orders, permanent deletion will be blocked to preserve student buyer receipts.
              </p>
              <p className="text-neutral-500">
                If you just want to stop receiving new orders, we recommend pausing or archiving instead.
              </p>
            </div>
          )}

          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteBlockedError(null);
              }}
              className="flex-1 rounded-xl text-xs font-bold h-11"
            >
              Cancel
            </Button>

            {deleteBlockedError ? (
              <Button
                type="button"
                onClick={() => {
                  if (deleteTarget) {
                    handleStatusChange(deleteTarget, 'archived');
                    setDeleteTarget(null);
                  }
                }}
                className="flex-1 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold gap-1.5 h-11"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive Listing Instead
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isDeleting}
                onClick={confirmSafeDelete}
                className="flex-1 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-bold gap-1.5 h-11"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? 'Checking...' : 'Confirm Delete'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}