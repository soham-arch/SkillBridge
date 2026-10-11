'use client';

import { useState, useEffect, Suspense, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  // 1. Service Not Found Error State (resolves navigation root cause)
  if (notFound || !service) {
    return (
      <div className="mx-auto w-full max-w-screen-md px-6 py-16">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#c3c6d7] bg-white p-12 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <XCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Service Listing Not Found</h1>
          <p className="mt-2 text-sm text-gray-500 max-w-md">
            The requested service identifier (<code className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-700">{serviceId || 'empty'}</code>) does not match any published listing in the database.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/explore">
              <Button className="gap-2 bg-[#004ac6] text-white hover:bg-[#003b9e] text-xs font-bold">
                <ArrowLeft className="h-4 w-4" />
                Back to Explore Catalog
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
      <div className="mx-auto w-full max-w-screen-md px-6 py-16">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-600 mb-3" />
          <h2 className="text-xl font-bold text-amber-900">Self-Booking Prohibited</h2>
          <p className="mt-2 text-xs text-amber-800 max-w-md mx-auto">
            You are the owner of <strong>"{service.title}"</strong>. SkillBridge platform rules strictly prohibit sellers from purchasing their own service listings.
          </p>
          <Link href={`/services/${service.id}`}>
            <Button className="mt-5 bg-amber-700 text-white hover:bg-amber-800 text-xs font-bold">
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
      <div className="mx-auto w-full max-w-screen-md px-6 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h2 className="text-xl font-bold text-gray-900">Listing Currently Unavailable</h2>
          <p className="mt-2 text-xs text-gray-600">
            This service is in <strong>{service.status}</strong> mode and cannot accept new orders.
          </p>
          <Link href="/explore">
            <Button className="mt-5 bg-[#004ac6] text-white text-xs font-bold">
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

    if (!requirements.trim()) {
      toast.error('Please describe your project requirements for the seller.');
      return;
    }

    setProcessing(true);
    setPaymentFailed(false);

    try {
      // Step A: Create order and Razorpay order server-side with verified database price
      const createRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
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
      // Generates cryptographic test signature matching server secret
      const testPaymentId = `pay_rzp_sbx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const testSignature = generateTestSignature({
        razorpayOrderId: orderData.razorpayOrderId,
        razorpayPaymentId: testPaymentId,
      });

      // Step C: Verify payment signature authoritatively on the server
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.orderId,
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
      try {
        await fetch('/api/payments/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: createdOrderId,
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
    <div className="mx-auto w-full max-w-screen-lg px-6 py-12">
      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={handleCancelCheckout}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Service Detail
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Requirements & Payment Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
            <div className="border-b border-gray-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#004ac6]">
                Secure Escrow Checkout
              </span>
              <h1 className="text-2xl font-black text-gray-900 mt-1">Order Details & Scope</h1>
            </div>

            <form onSubmit={handleCompletePayment} className="mt-6 space-y-5">
              <div>
                <Label htmlFor="requirements" className="text-xs font-bold text-gray-800">
                  Project Requirements & Deliverable Instructions <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="requirements"
                  required
                  rows={4}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Detail your goals, link reference drive files or Figma boards, and specify key milestones..."
                  className="mt-1.5 text-xs"
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <Label className="text-xs font-bold text-gray-800">Select Payment Method (Sandbox)</Label>
                <div className="mt-2 grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
                      paymentMethod === 'upi'
                        ? 'border-[#004ac6] bg-[#f0f4ff] text-[#004ac6]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <QrCode className="h-5 w-5 mb-1" />
                    <span className="text-xs font-bold">UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
                      paymentMethod === 'card'
                        ? 'border-[#004ac6] bg-[#f0f4ff] text-[#004ac6]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mb-1" />
                    <span className="text-xs font-bold">Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
                      paymentMethod === 'netbanking'
                        ? 'border-[#004ac6] bg-[#f0f4ff] text-[#004ac6]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Sparkles className="h-5 w-5 mb-1" />
                    <span className="text-xs font-bold">NetBanking</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'upi' && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-1.5">
                  <Label htmlFor="upiId" className="text-xs font-semibold text-gray-700">
                    Virtual Payment Address (VPA) / UPI ID
                  </Label>
                  <Input
                    id="upiId"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="bg-white text-xs"
                  />
                  <p className="text-[11px] text-gray-400">Supported: GPay, PhonePe, Paytm, BHIM</p>
                </div>
              )}

              {/* Razorpay Test Mode Transparency Card */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#004ac6]">
                  <Lock className="h-4 w-4" />
                  Razorpay Test Mode Sandbox
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  <strong>Student Project Demonstration:</strong> No real currency is debited. Funds are held in SkillBridge's platform escrow state until you inspect and approve the completed deliverables.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelCheckout}
                  className="flex-1 border-gray-200 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold h-11"
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Authorizing...
                    </div>
                  ) : (
                    `Pay ${formatINR(service.price)} & Secure Escrow`
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Order Summary & Guarantee (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
              Order Summary
            </h3>

            <div>
              <p className="text-base font-bold text-gray-900">{service.title}</p>
              {service.category && (
                <Badge variant="secondary" className="mt-1 text-[10px] bg-[#f0f4ff] text-[#004ac6]">
                  {service.category.name}
                </Badge>
              )}
            </div>

            <div className="space-y-2.5 text-xs text-gray-600 border-t border-gray-100 pt-3">
              <div className="flex justify-between">
                <span>Provider</span>
                <span className="font-semibold text-gray-900">{service.provider?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span>College</span>
                <span className="font-semibold text-gray-700">{service.provider?.college || 'Verified College'}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Time</span>
                <span className="font-semibold text-gray-900 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  {service.delivery_days || 3} Days Turnaround
                </span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee</span>
                <span className="font-bold text-emerald-600">FREE for Students</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between text-sm font-extrabold text-gray-900">
                <span>Total Escrow Amount</span>
                <span className="text-[#004ac6] text-base">{formatINR(service.price)}</span>
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-200/60 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                SkillBridge Escrow Protection
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                Payment is held safely in escrow. The seller only receives payout after you review and approve the submitted work.
              </p>
            </div>
          </div>
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
