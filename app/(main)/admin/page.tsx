'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Users,
  Briefcase,
  ShoppingBag,
  IndianRupee,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  fetchAllVerifications,
  adminReviewVerification,
} from '@/lib/services/verification';
import {
  fetchPlatformMetrics,
  moderateServiceListing,
  fetchAllOrdersAdmin,
  PlatformMetrics,
} from '@/lib/services/admin';
import { getAllServices, subscribeMarketplaceStore } from '@/lib/store/marketplace-store';
import { VerificationRequest, Service, Order } from '@/types';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'verifications' | 'services' | 'orders'>('verifications');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [m, v, s, o] = await Promise.all([
        fetchPlatformMetrics(),
        fetchAllVerifications(),
        getAllServices(),
        fetchAllOrdersAdmin(),
      ]);
      setMetrics(m);
      setVerifications(v);
      setServices(s);
      setOrders(o);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsub = subscribeMarketplaceStore(loadData);
    return unsub;
  }, [loadData]);

  async function handleVerify(id: string, approve: boolean) {
    try {
      await adminReviewVerification(id, approve, approve ? 'Documents verified successfully' : 'Invalid document');
      toast.success(approve ? 'Student verification approved!' : 'Verification rejected.');
      loadData();
    } catch (err) {
      toast.error('Action failed');
    }
  }

  async function handleModerate(serviceId: string, status: 'published' | 'paused') {
    try {
      await moderateServiceListing(serviceId, status);
      toast.success(`Service status changed to ${status}`);
      loadData();
    } catch (err) {
      toast.error('Moderation failed');
    }
  }

  return (
    <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 mb-2 border border-red-200">
            <ShieldAlert className="h-3.5 w-3.5" />
            Administrator Console
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Command Center</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review student verifications, oversee transactions, and moderate active marketplace services.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <span className="text-xs text-gray-400 font-semibold block">Total Students</span>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{metrics.totalUsers}</p>
            <span className="text-[11px] text-emerald-600 font-semibold">
              {metrics.verifiedStudents} Verified
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <span className="text-xs text-gray-400 font-semibold block">Active Services</span>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{metrics.totalServices}</p>
            <span className="text-[11px] text-gray-500">Peer Offerings</span>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <span className="text-xs text-gray-400 font-semibold block">Total Orders</span>
            <p className="text-2xl font-extrabold text-[#004ac6] mt-1">{metrics.totalOrders}</p>
            <span className="text-[11px] text-gray-500">{metrics.completedOrders} Completed</span>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <span className="text-xs text-gray-400 font-semibold block">Gross Volume</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              ₹{metrics.grossMarketplaceVolume.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-emerald-700">Platform GMV</span>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <span className="text-xs text-gray-400 font-semibold block">Pending Verifications</span>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">
              {metrics.pendingVerifications}
            </p>
            <span className="text-[11px] text-amber-700">Needs Review</span>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <span className="text-xs text-gray-400 font-semibold block">Disputes</span>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">0</p>
            <span className="text-[11px] text-emerald-600 font-semibold">100% Resolved</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'verifications'
              ? 'bg-[#004ac6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Verification Queue ({verifications.filter((v) => v.status === 'pending').length} Pending)
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'services'
              ? 'bg-[#004ac6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Services Moderation ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'orders'
              ? 'bg-[#004ac6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Orders ({orders.length})
        </button>
      </div>

      {/* TAB 1: Student Verification Queue */}
      {activeTab === 'verifications' && (
        <div className="space-y-4">
          {verifications.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white p-8 rounded-2xl border">
              No verification requests pending.
            </p>
          ) : (
            verifications.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border border-[#c3c6d7]">
                    {item.user?.avatar_url && <AvatarImage src={item.user.avatar_url} />}
                    <AvatarFallback className="font-bold text-[#004ac6]">
                      {item.user?.full_name?.slice(0, 2).toUpperCase() ?? 'ST'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{item.user?.full_name ?? 'Student'}</h3>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-bold uppercase rounded-full ${
                          item.status === 'verified'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-gray-600 mt-0.5">
                      College: <strong>{item.college_name}</strong>
                    </p>

                    {item.college_email && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Email: <code>{item.college_email}</code>
                      </p>
                    )}

                    {item.document_url && (
                      <a
                        href={item.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#004ac6] hover:underline mt-1"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Attached ID Card Document
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.status === 'pending' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleVerify(item.id, true)}
                        className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve Badge
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerify(item.id, false)}
                        className="border-gray-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium italic">
                      Decision Recorded
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Services Moderation */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-400">#{svc.id.slice(-6)}</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] font-bold uppercase rounded-full ${
                      svc.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {svc.status}
                  </Badge>
                  {svc.category && (
                    <span className="text-xs text-[#004ac6] font-semibold">{svc.category.name}</span>
                  )}
                </div>
                <h3 className="text-base font-bold text-gray-900">{svc.title}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  By {svc.provider?.full_name} · ₹{svc.price.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/services/${svc.id}`} target="_blank">
                  <Button size="sm" variant="outline" className="border-gray-200 text-xs">
                    View
                  </Button>
                </Link>
                {svc.status === 'published' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleModerate(svc.id, 'paused')}
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 text-xs"
                  >
                    Pause Listing
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleModerate(svc.id, 'published')}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
                  >
                    Activate Listing
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: All Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-400">#{o.id.slice(-6).toUpperCase()}</span>
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase rounded-full">
                    {o.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs font-bold text-emerald-600">
                    Payment: {o.payment_status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900">{o.service?.title ?? 'Service'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Buyer: {o.buyer?.full_name} · Seller: {o.seller?.full_name} · ₹{o.price}
                </p>
              </div>

              <Link href={`/orders/${o.id}`}>
                <Button size="sm" className="bg-[#004ac6] text-white hover:bg-[#003b9e] text-xs">
                  Inspect Order →
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
