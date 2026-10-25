'use client';

import { useState, useEffect, Suspense, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  CreditCard,
  QrCode,
  Sparkles,
  AlertCircle,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { getServiceById, isValidUUID } from '@/lib/services/services';
import { generateTestSignature, formatINR } from '@/lib/payments/razorpay';
import { Reveal } from '@/components/motion/reveal';
import { editorialEase } from '@/components/motion/motion-tokens';
import type { Service, PaymentMethod } from '@/types';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, user } = useAuth();
  const { loading: authLoading } = useRequireAuth();

  const serviceId = searchParams.get('serviceId') || '';

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [requirements, setRequirements] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [upiId, setUpiId] = useState('student@okhdfcbank');
  const [processing, setProcessing] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);

  // Load and validate service from database
  useEffect(() => {
    async function loadService() {
      if (!serviceId || !isValidUUID(serviceId)) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const data = await getServiceById(serviceId);
        if (!data) {
          setNotFound(true);
        } else {
          setService(data);
        }
      } catch (err) {
        console.error('Error fetching service for checkout:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadService();
  }, [serviceId]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-20 animate-pulse">
        <div className="h-4 w-28 bg-neutral-200 rounded mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 bg-neutral-200/60 rounded-3xl" />
          <div className="lg:col-span-5 h-80 bg-neutral-200/50 rounded-3xl" />
        </div>
      </div>
    );
  }

  // 1. Service Not Found Error State
  if (notFound || !service) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 sm:px-6 py-20 text-center">
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-10 shadow-sm">
          <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <XCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Service Listing Not Found</h1>
          <p className="mt-2 text-xs text-neutral-500 max-w-md mx-auto">
            The requested service identifier (<code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800 font-mono text-[11px]">{serviceId || 'empty'}</code>) does not match any published listing in the database.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/explore">
              <Button className="gap-2 bg-[#004ac6] text-white hover:bg-[#003da6] text-xs font-semibold rounded-full px-6">
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to Explore Catalog
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Self-booking Prevention State
  const currentUserId = user?.id || session?.user?.id;
  const isOwner = !!(currentUserId && service.provider_id === currentUserId);

  if (isOwner) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 sm:px-6 py-20 text-center">
        <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-10 shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-600 mb-3" />
          <h2 className="text-xl font-bold text-amber-950">Self-Booking Prohibited</h2>
          <p className="mt-2 text-xs text-amber-900/80 max-w-md mx-auto">
            You are the author of <strong>&ldquo;{service.title}&rdquo;</strong>. SkillBridge platform rules strictly prohibit sellers from purchasing their own service listings.
          </p>
          <Link href={`/services/${service.id}`}>
            <Button className="mt-6 bg-amber-800 text-white hover:bg-amber-900 text-xs font-semibold rounded-full px-6">
              Return to Service Detail
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Unpublished Listing State
  if (service.status !== 'published') {
    return (
      <div className="mx-auto w-full max-w-xl px-4 sm:px-6 py-20 text-center">
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-neutral-400 mb-3" />
          <h2 className="text-xl font-bold text-neutral-900">Listing Currently Unavailable</h2>
          <p className="mt-2 text-xs text-neutral-500">
            This service is currently in <strong>{service.status}</strong> mode and cannot accept new orders.
          </p>
          <Link href="/explore">
            <Button className="mt-6 bg-[#004ac6] text-white hover:bg-[#003da6] text-xs font-semibold rounded-full px-6">
              Browse Other Campus Services
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 4. Handle Authoritative Server Order & Payment Execution
  async function handleCompletePayment(e: FormEvent) {
    e.preventDefault();

    if (!service) return;

    const activeUserId = user?.id || session?.user?.id;
    if (!activeUserId && !session?.access_token) {
      toast.error('Please sign in to complete checkout.');
      router.push(`/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (!requirements.trim()) {
      toast.error('Please describe your project requirements for the seller.');
      return;
    }

    setProcessing(true);
    setPaymentFailed(false);

    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      authHeaders['Authorization'] = `Bearer ${session.access_token}`;
    }
    if (activeUserId) {
      authHeaders['x-user-id'] = activeUserId;
    }

    try {
      // Step A: Create order and Razorpay order server-side with verified database price
      const createRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          serviceId: service.id,
          buyerId: activeUserId,
          requirements: requirements.trim(),
          paymentMethod,
          orderType: service.service_type === 'consultation' ? 'consultation' : 'fixed_gig',
        }),
      });

      const orderData = await createRes.json();
      if (!createRes.ok || !orderData.orderId) {
        throw new Error(orderData.error || 'Failed to initialize payment order on server.');
      }

      setCreatedOrderId(orderData.orderId);

      // Step B: Simulate Razorpay Test Mode client authorization
      const testPaymentId = `pay_rzp_sbx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const testSignature = generateTestSignature({
        razorpayOrderId: orderData.razorpayOrderId,
        razorpayPaymentId: testPaymentId,
      });

      // Step C: Verify payment signature authoritatively on the server
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          orderId: orderData.orderId,
          buyerId: activeUserId,
          razorpayOrderId: orderData.razorpayOrderId,
          razorpayPaymentId: testPaymentId,
          razorpaySignature: testSignature,
          paymentMethod,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Authoritative payment verification failed.');
      }

      toast.success('Payment verified! Funds held safely in SkillBridge Escrow.');
      router.push(`/orders/${orderData.orderId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout transaction failed.';
      toast.error(msg);
      setPaymentFailed(true);
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancelCheckout() {
    if (createdOrderId) {
      const activeUserId = user?.id || session?.user?.id;
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }
      if (activeUserId) {
        authHeaders['x-user-id'] = activeUserId;
      }
      try {
        await fetch('/api/payments/cancel', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            orderId: createdOrderId,
            buyerId: activeUserId,
            reason: 'Buyer abandoned checkout.',
          }),
        });
      } catch {
        // Non-fatal
      }
    }
    if (service) {
      router.push(`/services/${service.id}`);
    } else {
      router.push('/explore');
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Back button */}
      <Reveal>
        <div className="mb-8">
          <button
            onClick={handleCancelCheckout}
            className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Back to Service Listing
          </button>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Requirements & Payment Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Reveal>
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-10 shadow-sm">
              <div className="border-b border-neutral-100 pb-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#004ac6]">
                  Guaranteed Escrow Protection
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight mt-1">
                  Scope Brief & Authorization
                </h1>
              </div>

              <form onSubmit={handleCompletePayment} className="mt-6 space-y-6">
                <div>
                  <Label htmlFor="requirements" className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Project Instructions & Requirements <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="requirements"
                    required
                    rows={4}
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="Detail your goals, link reference Drive folders or Figma boards, and specify key milestones..."
                    className="mt-2 text-xs rounded-2xl resize-none"
                  />
                </div>

                {/* Payment Method Selector */}
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Payment Method (Sandbox / Test Mode)
                  </Label>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`flex flex-col items-center rounded-2xl border p-3.5 text-center transition-all ${
                        paymentMethod === 'upi'
                          ? 'border-[#004ac6] bg-[#004ac6]/5 text-[#004ac6] font-bold shadow-sm'
                          : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                      }`}
                    >
                      <QrCode className="h-5 w-5 mb-1.5" />
                      <span className="text-xs">UPI / QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`flex flex-col items-center rounded-2xl border p-3.5 text-center transition-all ${
                        paymentMethod === 'card'
                          ? 'border-[#004ac6] bg-[#004ac6]/5 text-[#004ac6] font-bold shadow-sm'
                          : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                      }`}
                    >
                      <CreditCard className="h-5 w-5 mb-1.5" />
                      <span className="text-xs">Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('netbanking')}
                      className={`flex flex-col items-center rounded-2xl border p-3.5 text-center transition-all ${
                        paymentMethod === 'netbanking'
                          ? 'border-[#004ac6] bg-[#004ac6]/5 text-[#004ac6] font-bold shadow-sm'
                          : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                      }`}
                    >
                      <Sparkles className="h-5 w-5 mb-1.5" />
                      <span className="text-xs">NetBanking</span>
                    </button>
                  </div>
                </div>

                {paymentMethod === 'upi' && (
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-1.5">
                    <Label htmlFor="upiId" className="text-xs font-semibold text-neutral-700">
                      Virtual Payment Address (VPA) / UPI ID
                    </Label>
                    <Input
                      id="upiId"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="bg-white text-xs rounded-xl"
                    />
                    <p className="text-[11px] text-neutral-400">Supported: GPay, PhonePe, Paytm, BHIM</p>
                  </div>
                )}

                {/* Razorpay Test Mode Transparency Card */}
                <div className="rounded-2xl border border-[#004ac6]/20 bg-[#004ac6]/5 p-4 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#004ac6]">
                    <Lock className="h-4 w-4" />
                    Razorpay Campus Sandbox Simulation
                  </div>
                  <p className="text-[11px] text-neutral-700 leading-relaxed">
                    <strong>Demonstration Mode:</strong> No real currency is deducted. Funds are transferred into SkillBridge&apos;s escrow contract state until you review and approve completed deliverables.
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelCheckout}
                    className="flex-1 border-neutral-200 text-xs font-semibold rounded-full h-11"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={processing}
                    className="flex-1 bg-neutral-900 text-white hover:bg-[#004ac6] text-xs font-bold rounded-full h-11 shadow-sm transition-colors"
                  >
                    {processing ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Authorizing Escrow...
                      </div>
                    ) : (
                      `Pay ${formatINR(service.price)} & Secure Escrow`
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Reveal>
        </div>

        {/* Right: Order Summary & Guarantee (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Reveal>
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 pb-3">
                Order Summary
              </h3>

              <div>
                <p className="text-lg font-black text-neutral-900 leading-snug">{service.title}</p>
                {service.category && (
                  <Badge variant="secondary" className="mt-2 text-[10px] bg-neutral-100 text-neutral-700 rounded-full font-semibold">
                    {service.category.name}
                  </Badge>
                )}
              </div>

              <div className="space-y-3 text-xs text-neutral-600 border-t border-neutral-100 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Provider</span>
                  <span className="font-bold text-neutral-900">{service.provider?.full_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">College</span>
                  <span className="font-semibold text-neutral-700">{service.provider?.college || 'Verified Campus'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Turnaround</span>
                  <span className="font-semibold text-neutral-900 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-neutral-400" />
                    {service.delivery_days || 3} Days Delivery
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Platform Service Fee</span>
                  <span className="font-bold text-emerald-600 uppercase text-[11px]">Free for Students</span>
                </div>
                <div className="border-t border-neutral-100 pt-4 flex justify-between items-center text-sm font-extrabold text-neutral-900">
                  <span>Total Escrow Amount</span>
                  <span className="text-[#004ac6] text-xl font-black">{formatINR(service.price)}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50/60 p-4 border border-emerald-200/80 text-xs text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  SkillBridge Escrow Assurance
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-900/80">
                  Payment is held safely in escrow. The seller only receives payout after you review and approve the submitted work.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
