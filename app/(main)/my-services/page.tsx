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
  Layers,
  ShoppingBag,
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
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    description: 'Active and discoverable by students across campus search & AI.',
  },
  paused: {
    label: 'Paused',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    description: 'Temporarily paused. Hidden from search; not taking new orders.',
  },
  draft: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    description: 'Unpublished draft. Only visible to you until published.',
  },
  archived: {
    label: 'Archived',
    badgeClass: 'bg-zinc-100 text-zinc-600 border border-zinc-200',
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
      // Tab filter
      if (activeTab !== 'all' && svc.status !== activeTab) {
        return false;
      }
      // Search filter
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

  // Status action handler (Pause / Resume / Archive)
  async function handleStatusChange(service: Service, newStatus: ServiceStatus) {
    setTogglingId(service.id);
    try {
      await changeServiceStatus(service.id, newStatus, user?.id);

      // Optimistic state update
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

  // Safe delete handler
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
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
    <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
      {/* Top Banner / Heading */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">My Services</h1>
            <Badge className="bg-[#f0f4ff] text-[#004ac6] font-semibold border-0">
              {services.length} Listings
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Create, publish, pause, and manage your campus talent listings.
          </p>
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
            <Button className="gap-2 bg-[#004ac6] text-white hover:bg-[#003b9e] font-bold shadow-sm">
              <PlusCircle className="h-4 w-4" />
              Create New Service
            </Button>
          </Link>
        </div>
      </div>

      {/* Buyer notice if role not yet activated */}
      {!isAdmin && !isSeller && (
        <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-gray-900">You are currently in Buyer mode</h4>
            <p className="text-xs text-gray-600 mt-1">
              Enable your Seller role in profile settings to publish listings and monetize your skills across campus.
            </p>
          </div>
          <Link href="/profile?tab=roles">
            <Button size="sm" className="bg-[#004ac6] text-white hover:bg-[#003b9e] font-semibold">
              Enable Seller Role
            </Button>
          </Link>
        </div>
      )}

      {/* Metrics Row */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-gray-500">Active & Published</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{counts.published}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-gray-500">Paused</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{counts.paused}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-gray-500">Drafts</span>
          <p className="text-2xl font-bold text-gray-600 mt-1">{counts.draft}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-gray-500">Archived</span>
          <p className="text-2xl font-bold text-zinc-500 mt-1">{counts.archived}</p>
        </div>
      </div>

      {/* Controls: Tabs & Search */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-4">
        {/* Tabs */}
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
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#004ac6] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your listings..."
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      {/* Listings list */}
      {filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#c3c6d7] bg-white py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0f4ff] text-[#004ac6]">
            <PlusCircle className="h-7 w-7" />
          </div>
          <p className="text-base font-bold text-gray-800">
            {services.length === 0 ? 'No listings created yet' : 'No matching listings found'}
          </p>
          <p className="mt-1 text-xs text-gray-500 max-w-sm">
            {services.length === 0
              ? 'Publish your first skill listing to offer development, design, tutoring, or content services to fellow students.'
              : 'Try clearing your search query or selecting a different status filter above.'}
          </p>
          {services.length === 0 && (
            <Link href="/services/create">
              <Button className="mt-5 gap-2 bg-[#004ac6] text-white hover:bg-[#003b9e] text-xs font-bold">
                <PlusCircle className="h-4 w-4" />
                Create Service Listing
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
                className="group rounded-2xl border border-border bg-white p-6 shadow-sm hover:border-[#004ac6]/40 hover:shadow-md transition-all"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left: Metadata */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {svc.category && (
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-[#f0f4ff] px-2.5 py-0.5 text-xs font-semibold text-[#004ac6]"
                        >
                          {svc.category.name}
                        </Badge>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${config.badgeClass}`}
                      >
                        {config.label}
                      </span>
                      {svc.service_type && (
                        <Badge variant="outline" className="text-[11px] capitalize text-gray-600">
                          {svc.service_type.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#004ac6] transition-colors">
                      {svc.title}
                    </h3>
                    <p className="line-clamp-2 text-xs text-gray-600 leading-relaxed">
                      {svc.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 pt-1">
                      <span className="font-bold text-gray-900 text-sm">
                        ₹{svc.price.toLocaleString('en-IN')}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {svc.delivery_days || 3} days turnaround
                      </span>
                      {svc.completed_orders_count !== undefined && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="h-3.5 w-3.5 text-gray-400" />
                            {svc.completed_orders_count} completed orders
                          </span>
                        </>
                      )}
                      {svc.location && (
                        <>
                          <span>·</span>
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
                        className="h-9 gap-1.5 border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
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
                        className="h-9 gap-1.5 border-gray-200 text-xs text-gray-700 hover:bg-gray-50 font-semibold"
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
                        className="h-9 gap-1.5 border-amber-200 bg-amber-50/50 text-xs text-amber-700 hover:bg-amber-100 font-semibold"
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
                        className="h-9 gap-1.5 border-emerald-200 bg-emerald-50/50 text-xs text-emerald-700 hover:bg-emerald-100 font-semibold"
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
                        className="h-9 gap-1.5 bg-[#004ac6] text-white hover:bg-[#003b9e] text-xs font-semibold"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Publish
                      </Button>
                    )}

                    {/* Archive (if not archived) */}
                    {svc.status !== 'archived' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isToggling}
                        onClick={() => handleStatusChange(svc, 'archived')}
                        className="h-9 gap-1.5 border-gray-200 text-xs text-gray-600 hover:bg-gray-100"
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
                      className="h-9 gap-1.5 border-red-200 text-xs text-red-600 hover:bg-red-50"
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
        <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-gray-900">
              Delete Service Listing?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-gray-600 mt-1">
              You are about to delete &ldquo;{deleteTarget?.title}&rdquo;.
            </DialogDescription>
          </DialogHeader>

          {deleteBlockedError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                Historical Order Preservation Active
              </p>
              <p className="leading-relaxed">{deleteBlockedError}</p>
              <p className="text-[11px] text-amber-700">
                You can safely <strong>archive</strong> or <strong>pause</strong> the listing
                instead. This hides it from campus discovery while retaining student order history.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5 text-xs text-gray-600 space-y-1.5">
              <p>
                <strong>Safe Deletion Check:</strong> If this service has past orders, permanent
                deletion will be blocked to preserve student buyer receipts.
              </p>
              <p className="text-gray-500">
                If you just want to stop receiving new orders, we recommend pausing or archiving
                instead.
              </p>
            </div>
          )}

          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteBlockedError(null);
              }}
              className="flex-1 text-xs"
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
                className="flex-1 bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold gap-1.5"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive Listing Instead
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isDeleting}
                onClick={confirmSafeDelete}
                className="flex-1 bg-red-600 text-white hover:bg-red-700 text-xs font-bold gap-1.5"
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