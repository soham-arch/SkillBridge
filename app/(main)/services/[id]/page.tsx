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
  AlertTriangle,
  Edit3,
  ExternalLink,
  Pause,
  Archive,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth/auth-context';
import { getServiceById } from '@/lib/services/services';
import { fetchServiceReviews, calculateRatingBreakdown } from '@/lib/services/reviews';
import { RatingBreakdown } from '@/components/reviews/rating-breakdown';
import { ReviewCard } from '@/components/reviews/review-card';
import { BookingModal } from '@/components/booking/booking-modal';
import { CheckoutModal } from '@/components/orders/checkout-modal';
import { isConsultationService } from '@/lib/services/orders';
import { VerifiedBadge } from '@/components/trust/verified-badge';
import type { Service, Review, ServiceMedia } from '@/types';

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session, user, isAdmin } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const svc = await getServiceById(params.id);
        setService(svc);

        if (svc) {
          const svcReviews = await fetchServiceReviews(svc.id);
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

  const currentUserId = session?.user?.id;
  const isOwner = !!(currentUserId && service.provider_id === currentUserId);
  const canManage = isOwner || isAdmin;

  // If service is draft or moderated and caller is NOT owner/admin, block public access
  if (
    (service.status === 'draft' || service.status === 'moderated') &&
    !canManage
  ) {
    return (
      <div className="mx-auto w-full max-w-screen-xl px-6 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Listing Unavailable</h2>
          <p className="mt-2 text-xs text-gray-600">
            This listing is currently in {service.status} mode and is not discoverable by the public.
          </p>
          <Link href="/explore">
            <Button className="mt-6 bg-[#004ac6] text-white hover:bg-[#003b9e] text-xs font-bold">
              Explore Available Services
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const breakdown = calculateRatingBreakdown(reviews);
  const avgRating = breakdown.totalReviews > 0 ? breakdown.averageRating : (service.rating ?? 0);

  const providerInitials = service.provider?.full_name
    ? service.provider.full_name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const isPaused = service.status === 'paused';
  const isArchived = service.status === 'archived';
  const isOrderingDisabled = isPaused || isArchived;

  return (
    <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
      {/* Owner preview / management banner */}
      {canManage && service.status !== 'published' && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Owner Preview Mode:</strong> This listing is currently{' '}
              <span className="font-bold uppercase tracking-wide">{service.status}</span> and hidden
              from student search.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/services/${service.id}/edit`}>
              <Button size="sm" className="bg-[#004ac6] text-white hover:bg-[#003b9e] font-semibold text-xs h-8 gap-1.5">
                <Edit3 className="h-3.5 w-3.5" />
                Edit Listing
              </Button>
            </Link>
            <Link href="/my-services">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 bg-white text-xs h-8">
                My Services
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Paused banner for public visitor */}
      {!canManage && isPaused && (
        <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 shadow-sm">
          <Pause className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>Service Paused:</strong> This student provider has temporarily paused new orders. You can still review the portfolio and check back later.
          </span>
        </div>
      )}

      {/* Archived banner for public visitor */}
      {!canManage && isArchived && (
        <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-zinc-200 bg-zinc-100 p-4 text-xs text-zinc-700 shadow-sm">
          <Archive className="h-4 w-4 shrink-0 text-zinc-500" />
          <span>
            <strong>Listing Archived:</strong> This skill offering is no longer actively accepting bookings or orders.
          </span>
        </div>
      )}

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
          {/* Cover image if available */}
          {service.cover_image_url && (
            <div className="overflow-hidden rounded-2xl border border-border bg-gray-100 max-h-72 shadow-sm">
              <img
                src={service.cover_image_url}
                alt={service.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

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
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  service.status === 'published'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : service.status === 'paused'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {service.status}
              </Badge>
              {service.service_type && (
                <Badge variant="outline" className="text-xs capitalize text-gray-600">
                  {service.service_type.replace('_', ' ')}
                </Badge>
              )}
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
                <span className="text-xs text-gray-400 block">Turnaround Time</span>
                <span className="font-semibold text-gray-800 flex items-center gap-1">
                  <Clock className="h-4 w-4 text-[#004ac6]" />
                  {service.delivery_days || 3} Days
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Rating & Orders</span>
                <span className="font-semibold text-gray-800 flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {avgRating.toFixed(1)} ({reviews.length || service.reviews_count || 5} reviews · {service.completed_orders_count || 0} done)
                </span>
              </div>
              {service.location && (
                <div>
                  <span className="text-xs text-gray-400 block">Delivery Location</span>
                  <span className="font-semibold text-gray-800 flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-[#004ac6]" />
                    {service.location}
                  </span>
                </div>
              )}
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
              About This Service Scope
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {service.description}
            </p>
          </div>

          {/* Availability Notes */}
          {service.availability_notes && (
            <div className="rounded-2xl border border-blue-100 bg-[#f4f7ff] p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#004ac6] mb-1">
                Provider Availability Requirements
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed">
                {service.availability_notes}
              </p>
            </div>
          )}

          {/* Portfolio Examples */}
          {service.portfolio_examples && service.portfolio_examples.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                Portfolio & Past Work Examples
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {service.portfolio_examples.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-gray-200 p-3.5 hover:border-[#004ac6] hover:bg-blue-50/30 transition-all text-xs"
                  >
                    <span className="font-semibold text-gray-900 truncate">{item.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-[#004ac6] shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            </div>
          )}

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

          {/* Authoritative Rating Breakdown & Trust */}
          <RatingBreakdown
            breakdown={breakdown}
            title={`Student Reviews & Reputation (${breakdown.totalReviews})`}
          />

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-500">
                No verified reviews yet for this listing. Be the first peer to book and review!
              </div>
            ) : (
              reviews.map((rev) => (
                <ReviewCard
                  key={rev.id}
                  review={rev}
                  onReportSubmitted={async () => {
                    const fresh = await fetchServiceReviews(service.id);
                    setReviews(fresh);
                  }}
                />
              ))
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
                {isOrderingDisabled ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                    <p className="text-xs font-bold text-amber-800">
                      Orders Currently {service.status === 'paused' ? 'Paused' : 'Unavailable'}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      This provider is not accepting new orders at this time.
                    </p>
                    <Button disabled className="w-full mt-3 bg-gray-300 text-gray-500 py-5 text-sm font-bold">
                      Not Available
                    </Button>
                  </div>
                ) : isConsultationService(service) ? (
                  <div className="space-y-3">
                    <Button
                      onClick={() => setBookingOpen(true)}
                      className="w-full gap-2 bg-[#004ac6] py-6 text-base font-bold text-white hover:bg-[#003b9e] shadow-md hover:shadow-lg transition-all"
                    >
                      <Calendar className="h-5 w-5" />
                      Schedule Consultation Session
                    </Button>
                    <p className="text-center text-[11px] text-gray-500">
                      Select date & time slot from the student provider&apos;s active calendar.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={() => setCheckoutOpen(true)}
                      className="w-full gap-2 bg-[#004ac6] py-6 text-base font-bold text-white hover:bg-[#003b9e] shadow-md hover:shadow-lg transition-all"
                    >
                      <ShoppingBag className="h-5 w-5" />
                      Order & Hire Student
                    </Button>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                      <span>Held safely in escrow</span>
                      <Link
                        href={`/checkout?serviceId=${service.id}`}
                        className="font-bold text-[#004ac6] hover:underline"
                      >
                        Dedicated Checkout Page →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs font-medium text-[#004ac6] text-center">
                  This is your service listing ({service.status}).
                </div>
                <Link href={`/services/${service.id}/edit`}>
                  <Button className="w-full gap-2 bg-[#004ac6] text-white hover:bg-[#003b9e] py-5 font-bold">
                    <Edit3 className="h-4 w-4" />
                    Edit This Listing
                  </Button>
                </Link>
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
                  {service.provider.avatar_url && (
                    <AvatarImage src={service.provider.avatar_url} alt={service.provider.full_name} />
                  )}
                  <AvatarFallback className="bg-[#f0f4ff] font-bold text-[#004ac6]">
                    {providerInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{service.provider.full_name}</h3>
                  {service.provider.college && (
                    <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <GraduationCap className="h-3.5 w-3.5 text-[#004ac6]" />
                      {service.provider.college}
                    </p>
                  )}
                  {service.provider.location && (
                    <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-[#004ac6]" />
                      {service.provider.location}
                    </p>
                  )}
                </div>
              </div>

              <Link href={`/profile/${service.provider.id}`}>
                <Button variant="outline" className="w-full text-xs font-semibold mt-2">
                  View Campus Profile & All Services
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Booking and Checkout Modals */}
      {bookingOpen && (
        <BookingModal
          service={service}
          customerId={currentUserId || '10000000-0000-0000-0000-000000000003'}
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
        />
      )}
      {checkoutOpen && (
        <CheckoutModal
          service={service}
          buyerId={currentUserId || '10000000-0000-0000-0000-000000000003'}
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </div>
  );
}