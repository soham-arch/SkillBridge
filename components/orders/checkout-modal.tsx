'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { placeOrderWithEscrow } from '@/lib/services/orders';
import { Service, PaymentMethod } from '@/types';

interface CheckoutModalProps {
  service: Service;
  buyerId: string;
  open: boolean;
  onClose: () => void;
}

export function CheckoutModal({ service, buyerId, open, onClose }: CheckoutModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<'requirements' | 'payment' | 'processing' | 'success' | 'failed'>('requirements');
  const [requirements, setRequirements] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [upiId, setUpiId] = useState('student@oksbi');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [simulateSuccess, setSimulateSuccess] = useState(true);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  if (!open) return null;

  async function handleProceedToPayment(e: FormEvent) {
    e.preventDefault();
    if (!requirements.trim()) {
      toast.error('Please describe your project requirements.');
      return;
    }
    setStep('payment');
  }

  async function handleExecutePayment() {
    setStep('processing');

    setTimeout(async () => {
      try {
        const { order } = await placeOrderWithEscrow({
          serviceId: service.id,
          buyerId,
          requirements: requirements.trim(),
          paymentMethod,
          paymentSuccess: simulateSuccess,
        });

        setCreatedOrderId(order.id);

        if (simulateSuccess) {
          setStep('success');
          toast.success('Payment authorized & held in SkillBridge Escrow!');
        } else {
          setStep('failed');
          toast.error('Payment authorization failed in test simulation.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Order creation failed';
        toast.error(msg);
        setStep('payment');
      }
    }, 1400);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* STEP 1: Requirements */}
        {step === 'requirements' && (
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#004ac6]">
                  Step 1 of 2 · Project Details
                </span>
                <h2 className="mt-1 text-xl font-bold text-gray-900">Request & Order Service</h2>
                <p className="text-xs text-gray-500 mt-0.5">{service.title}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-[#004ac6]">
                  ₹{service.price.toLocaleString('en-IN')}
                </span>
                <p className="text-[11px] text-gray-400">Fixed student price</p>
              </div>
            </div>

            <form onSubmit={handleProceedToPayment} className="mt-6 space-y-5">
              <div>
                <Label htmlFor="requirements" className="text-xs font-semibold text-gray-800">
                  What do you need? Provide clear instructions for the student{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="requirements"
                  required
                  rows={4}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Explain your goals, preferred style, links to reference files, or key deliverables..."
                  className="mt-1.5 resize-none text-sm"
                />
              </div>

              {/* Order summary box */}
              <div className="rounded-xl border border-blue-100 bg-[#f8faff] p-4 text-xs space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Provider</span>
                  <span className="font-semibold text-gray-900">{service.provider?.full_name}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Estimated Delivery</span>
                  <span className="font-semibold text-gray-900">{service.delivery_days || 3} Days</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Platform Fee</span>
                  <span className="font-semibold text-emerald-600">FREE for Students</span>
                </div>
                <div className="border-t border-blue-100/80 pt-2 flex justify-between text-sm font-bold text-gray-900">
                  <span>Total Escrow Amount</span>
                  <span className="text-[#004ac6]">₹{service.price.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-[11px] text-emerald-800 border border-emerald-200/50">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  <strong>SkillBridge Escrow Guarantee:</strong> Money is held safely. The seller only receives payment after you inspect and accept the completed work.
                </span>
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-gray-200 text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#004ac6] text-white hover:bg-[#003b9e]"
                >
                  Continue to Payment →
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Realistic Student Payment Gateway */}
        {step === 'payment' && (
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#004ac6]">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#004ac6]">
                  Step 2 of 2 · Secure Escrow Checkout
                </span>
                <h2 className="text-xl font-bold text-gray-900">SkillBridge Pay</h2>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {/* Payment Methods */}
              <div>
                <Label className="text-xs font-semibold text-gray-700">Choose Payment Method</Label>
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
                    <span className="text-xs font-bold">Debit / Card</span>
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

              {/* Method Inputs */}
              {paymentMethod === 'upi' && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
                  <Label htmlFor="upiId" className="text-xs font-semibold text-gray-700">
                    Enter Virtual Payment Address (VPA) / UPI ID
                  </Label>
                  <Input
                    id="upiId"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@okhdfcbank"
                    className="bg-white"
                  />
                  <p className="text-[11px] text-gray-400">Supported: Google Pay, PhonePe, Paytm, BHIM</p>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Card Number</Label>
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 •••• •••• 4242"
                      className="bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Expiry</Label>
                      <Input defaultValue="12/28" className="bg-white text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">CVV</Label>
                      <Input defaultValue="•••" type="password" maxLength={3} className="bg-white text-xs" />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'netbanking' && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">Select Bank</Label>
                  <select className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm">
                    <option>HDFC Bank</option>
                    <option>State Bank of India</option>
                    <option>ICICI Bank</option>
                    <option>Axis Bank</option>
                    <option>Kotak Mahindra Bank</option>
                  </select>
                </div>
              )}

              {/* Developer Test Mode Simulator */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                    Test Simulation Mode
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-amber-800">
                    <input
                      type="checkbox"
                      checked={simulateSuccess}
                      onChange={(e) => setSimulateSuccess(e.target.checked)}
                      className="rounded border-amber-300 text-[#004ac6]"
                    />
                    <span>Simulate Payment Success</span>
                  </label>
                </div>
                <p className="text-[11px] text-amber-700 mt-1">
                  Uncheck to test gateway failure handling (Test Case 7 in audit spec).
                </p>
              </div>

              {/* Total Button */}
              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('requirements')}
                  className="flex-1 border-gray-200 text-gray-700"
                >
                  ← Back
                </Button>
                <Button
                  type="button"
                  onClick={handleExecutePayment}
                  className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                >
                  Pay ₹{service.price.toLocaleString('en-IN')} & Secure
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Processing Animation */}
        {step === 'processing' && (
          <div className="p-12 text-center space-y-4">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
            <h3 className="text-lg font-bold text-gray-900">Authorizing Payment...</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Connecting to payment gateway and locking escrow funds. Please do not close this window.
            </p>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 'success' && (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Order Placed & Paid! 🎉</h2>
            <p className="text-sm text-gray-600 max-w-sm mx-auto">
              ₹{service.price.toLocaleString('en-IN')} has been secured in SkillBridge Escrow. The seller has been notified to accept and begin work.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => {
                  onClose();
                  if (createdOrderId) router.push(`/orders/${createdOrderId}`);
                  else router.push('/orders');
                }}
                className="flex-1 bg-[#004ac6] text-white hover:bg-[#003b9e]"
              >
                Track Your Order →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: Failed */}
        {step === 'failed' && (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <XCircle className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Payment Failed</h2>
            <p className="text-sm text-gray-600 max-w-sm mx-auto">
              The payment gateway simulation returned an authorization error. No funds were deducted.
            </p>
            <div className="pt-4 flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 border-gray-200"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setSimulateSuccess(true);
                  setStep('payment');
                }}
                className="flex-1 bg-[#004ac6] text-white hover:bg-[#003b9e]"
              >
                Retry Payment
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
