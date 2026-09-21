'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Star,
  User,
  GraduationCap,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth/auth-context';
import { getServiceById } from '@/lib/services/services';
import { getMarketplaceState } from '@/lib/store/marketplace-store';
import { BookingModal } from '@/components/booking/booking-modal';
import { CheckoutModal } from '@/components/orders/checkout-modal';
import { VerifiedBadge } from '@/components/trust/verified-badge';
import type { Service, Review, ServiceMedia } from '@/types';

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [media, setMedia] = useState<ServiceMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const svc = await getServiceById(params.id);
        setService(svc);

        if (svc) {
          const state = getMarketplaceState();
          const svcReviews = state.reviews.filter((r) => r.service_id === svc.id).map((r) => {
            const reviewer = state.profiles.find((p) => p.user_id === r.reviewer_id);
            return {
              ...r,
              reviewer: reviewer
                ? { id: reviewer.id, full_name: reviewer.full_name, avatar_url: reviewer.avatar_url, college: reviewer.college }
                : null,
            };
          });
          setReviews(svcReviews);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#c3c6d7] bg-white py-20 text-center">
          <p className="text-lg font-semibold text-gray-700">Service not found</p>
          <p className="mt-2 text-sm text-gray-500">
            This service may have been removed or is no longer available.
          </p>
          <Link href="/explore">
            <Button className="mt-6 gap-2 bg-[#004ac6] text-white hover:bg-[#003b9e]">
              <ArrowLeft className="h-4 w-4" />
              Back to Explore
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentUserId = session?.user?.id ?? '10000000-0000-0000-0000-000000000003'; // Rohan by default for test buyer
  const isOwner = currentUserId === service.provider_id;
  const isLoggedIn = !!session || true; // Demo allows one-click purchase

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : service.rating ?? 5.0;

  const providerInitials = service.provider?.full_name
    ? service.provider.full_name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/explore" className="font-medium text-[#004ac6] hover:underline">
          Explore
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {service.category && (
          <>
            <span className="text-gray-500">{service.category.name}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </>
        )}
        <span className="truncate text-gray-700 font-medium">{service.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Header */}
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {service.category && (
                <Badge
                  variant="secondary"
                  className="rounded-full bg-[#f0f4ff] px-3 py-1 text-xs font-semibold text-[#004ac6]"
                >
                  {service.category.name}
                </Badge>
              )}
              {service.provider?.verification_status === 'verified' && (
                <VerifiedBadge college={service.provider.college} size="sm" />
              )}
              <Badge
                variant="secondary"
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  service.status === 'published'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {service.status}
              </Badge>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl leading-tight">
              {service.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-gray-100 pt-4 text-sm">
              <div>
                <span className="text-xs text-gray-400 block">Pricing</span>
                <span className="text-2xl font-bold text-[#004ac6]">
                  ₹{service.price.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Delivery Time</span>
                <span className="font-semibold text-gray-800 flex items-center gap-1">
                  <Clock className="h-4 w-4 text-[#004ac6]" />
                  {service.delivery_days || 3} Days
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Rating & Orders</span>
                <span className="font-semibold text-gray-800 flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {avgRating.toFixed(1)} ({reviews.length || service.reviews_count || 5} reviews · {service.completed_orders_count || 12} done)
                </span>
              </div>
            </div>

            {/* Tags / Skills */}
            {service.skills && service.skills.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5 pt-3 border-t border-gray-100">
                {service.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                  >
                    #{skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
              About This Service
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {service.description}
            </p>
          </div>

          {/* Escrow Guarantee Banner */}
          <div className="rounded-2xl border border-blue-100 bg-[#f4f7ff] p-6 shadow-sm flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#004ac6] shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">SkillBridge Student Escrow Protection</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                When you hire on SkillBridge, your payment is held safely in escrow. The student provider is only paid once you inspect and accept the completed work. Revisions are supported!
              </p>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Student Reviews ({reviews.length})
              </h2>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">out of 5</span>
              </div>
            </div>

            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No reviews yet. Be the first student to request this service!</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => {
                  const reviewerInitials = rev.reviewer?.full_name
                    ? rev.reviewer.full_name
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : '?';

                  return (
                    <div
                      key={rev.id}
                      className="rounded-xl border border-gray-100 bg-[#fafafa] p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-[#c3c6d7]">
                            {rev.reviewer?.avatar_url && (
                              <AvatarImage src={rev.reviewer.avatar_url} />
                            )}
                            <AvatarFallback className="text-xs font-bold text-[#004ac6]">
                              {reviewerInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {rev.reviewer?.full_name ?? 'Student Client'}
                            </p>
                            {rev.reviewer?.college && (
                              <p className="text-[11px] text-gray-400">{rev.reviewer.college}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-gray-700 leading-relaxed italic">
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Order CTA & Provider Card */}
        <div className="space-y-6">
          {/* PRIMARY ORDER CTA BOX */}
          <div className="rounded-2xl border-2 border-[#004ac6]/30 bg-white p-6 sm:p-7 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#004ac6] text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
              Escrow Protected
            </div>

            <div className="mb-4">
              <span className="text-xs font-semibold text-gray-400">Total Price</span>
              <p className="text-3xl font-extrabold text-gray-900 mt-0.5">
                ₹{service.price.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-gray-500 mt-1">Delivery in {service.delivery_days || 3} days · Revisions included</p>
            </div>

            {!isOwner ? (
              <div className="space-y-3">
                <Button
                  onClick={() => setCheckoutOpen(true)}
                  className="w-full gap-2 bg-[#004ac6] py-6 text-base font-bold text-white hover:bg-[#003b9e] shadow-md hover:shadow-lg transition-all"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Order & Hire Student
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setBookingOpen(true)}
                  className="w-full gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <Calendar className="h-4 w-4" />
                  Schedule Consultation Session
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs font-medium text-[#004ac6] text-center">
                This is your service listing.
              </div>
            )}

            <div className="mt-5 border-t border-gray-100 pt-4 space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Zero platform commission for student buyers</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Full refund if provider doesn&apos;t deliver on time</span>
              </div>
            </div>
          </div>

          {/* Provider Card */}
          {service.provider && (
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Service Provider
              </h2>

              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border border-[#c3c6d7]">
                  {service.provider.avatar_url && <AvatarImage src={service.provider.avatar_url} />}
                  <AvatarFallback className="text-base font-bold text-[#004ac6]">
                    {providerInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-base font-bold text-gray-900">{service.provider.full_name}</p>
                  {service.provider.college && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <GraduationCap className="h-3.5 w-3.5 text-[#004ac6]" />
                      {service.provider.college}
                    </p>
                  )}
                </div>
              </div>

              {service.provider.verification_status === 'verified' && (
                <VerifiedBadge college={service.provider.college} />
              )}

              <Link
                href={`/profile/${service.provider_id}`}
                className="block text-center text-xs font-bold text-[#004ac6] hover:underline pt-2"
              >
                View Full Student Portfolio & Badges →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Escrow Modal */}
      <CheckoutModal
        service={service}
        buyerId={currentUserId}
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />

      {/* Booking Calendar Modal */}
      <BookingModal
        service={service}
        customerId={currentUserId}
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
      />
    </div>
  );
}