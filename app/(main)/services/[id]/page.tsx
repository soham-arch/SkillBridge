'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Star,
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
  ArrowUpRight,
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
import type { Service, Review } from '@/types';

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session, user, profile, isAdmin } = useAuth();
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
      <div className="flex flex-1 items-center justify-center py-32">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12 py-20">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-white py-24 text-center px-6">
          <p className="text-xl font-bold text-neutral-900">Service not found</p>
          <p className="mt-2 text-sm text-neutral-500 max-w-sm">
            This service may have been archived or removed from the campus catalog.
          </p>
          <Link href="/explore">
            <Button className="mt-6 rounded-xl bg-neutral-950 px-6 text-xs font-bold text-white hover:bg-black">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Catalog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentUserId = user?.id || session?.user?.id || profile?.user_id;
  const isOwner = !!(currentUserId && service.provider_id === currentUserId);
  const canManage = isOwner || isAdmin;

  if (
    (service.status === 'draft' || service.status === 'moderated') &&
    !canManage
  ) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12 py-20">
        <div className="mx-auto max-w-md rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600 mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">Listing Unavailable</h2>
          <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
            This listing is currently in {service.status} mode and is hidden from public discovery.
          </p>
          <Link href="/explore">
            <Button className="mt-6 rounded-xl bg-neutral-950 text-white hover:bg-black text-xs font-bold px-6">
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
    : 'SB';

  const isPaused = service.status === 'paused';
  const isArchived = service.status === 'archived';
  const isOrderingDisabled = isPaused || isArchived;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12 py-10 sm:py-14">
      {/* Owner preview / management banner */}
      {canManage && service.status !== 'published' && (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
            <span>
              <strong>Owner Preview Mode:</strong> This listing is currently{' '}
              <span className="font-bold uppercase tracking-wide">{service.status}</span> and hidden from discovery.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/services/${service.id}/edit`}>
              <Button size="sm" className="bg-neutral-950 text-white hover:bg-black font-bold text-xs h-8 gap-1.5 rounded-lg">
                <Edit3 className="h-3 w-3" />
                Edit Listing
              </Button>
            </Link>
            <Link href="/my-services">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 bg-white text-xs h-8 rounded-lg">
                My Services
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Paused banner */}
      {!canManage && isPaused && (
        <div className="mb-8 flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <Pause className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            <strong>Service Paused:</strong> The student provider is currently not accepting new orders.
          </span>
        </div>
      )}

      {/* Archived banner */}
      {!canManage && isArchived && (
        <div className="mb-8 flex items-center gap-2.5 rounded-2xl border border-neutral-200 bg-neutral-100 p-4 text-xs text-neutral-700">
          <Archive className="h-4 w-4 shrink-0 text-neutral-500" />
          <span>
            <strong>Listing Archived:</strong> This skill offering is no longer accepting bookings.
          </span>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
        <Link href="/explore" className="text-neutral-700 hover:text-[#004ac6] transition-colors font-bold">
          CATALOG
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {service.category && (
          <>
            <span className="text-neutral-600">{service.category.name}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </>
        )}
        <span className="truncate text-neutral-900 font-bold max-w-xs">{service.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Main Content (Left 8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Cover image */}
          {service.cover_image_url && (
            <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-100 max-h-96 shadow-2xs">
              <img
                src={service.cover_image_url}
                alt={service.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Service Title & Primary Meta */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {service.category && (
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  {service.category.name}
                </span>
              )}
              {service.provider?.verification_status === 'verified' && (
                <VerifiedBadge college={service.provider.college} size="sm" />
              )}
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  service.status === 'published'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {service.status}
              </span>
              {service.service_type && (
                <span className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 capitalize">
                  {service.service_type.replace('_', ' ')}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-950 leading-[1.08]">
              {service.title}
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-neutral-100">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                  Starting Price
                </span>
                <span className="text-2xl font-black tracking-tight text-neutral-950 font-mono">
                  ₹{service.price.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                  Delivery Time
                </span>
                <span className="text-base font-bold text-neutral-800 flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-4 w-4 text-[#004ac6]" />
                  {service.delivery_days || 3} Days
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                  Student Rating
                </span>
                <span className="text-base font-bold text-neutral-800 flex items-center gap-1.5 mt-0.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {avgRating.toFixed(1)} ({reviews.length || service.reviews_count || 5})
                </span>
              </div>
              {service.location && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                    Campus Location
                  </span>
                  <span className="text-base font-bold text-neutral-800 flex items-center gap-1.5 mt-0.5 truncate">
                    <MapPin className="h-4 w-4 text-[#004ac6]" />
                    {service.location}
                  </span>
                </div>
              )}
            </div>

            {/* Skills / Tags */}
            {service.skills && service.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-100">
                {service.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700"
                  >
                    #{skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Scope & Description */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 shadow-xs space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
              // Service Scope & Deliverables
            </h2>
            <div className="whitespace-pre-wrap text-base leading-relaxed text-neutral-700 font-normal">
              {service.description}
            </div>
          </div>

          {/* Availability Notes */}
          {service.availability_notes && (
            <div className="rounded-3xl border border-blue-200/80 bg-blue-50/40 p-8 shadow-xs space-y-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#004ac6]">
                // Provider Scheduling Notes
              </h3>
              <p className="text-sm text-neutral-700 leading-relaxed">
                {service.availability_notes}
              </p>
            </div>
          )}

          {/* Portfolio Work */}
          {service.portfolio_examples && service.portfolio_examples.length > 0 && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 shadow-xs space-y-6">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                // Verified Work Portfolio
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {service.portfolio_examples.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between rounded-2xl border border-neutral-200 bg-[#fbfbfa] p-4 text-xs font-bold text-neutral-900 hover:border-neutral-900 hover:bg-white transition-all shadow-2xs"
                  >
                    <span className="truncate">{item.title}</span>
                    <ArrowUpRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-900 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Escrow Guarantee Box */}
          <div className="rounded-3xl border border-neutral-200 bg-neutral-900 text-white p-8 sm:p-10 shadow-xs flex items-start gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-800 text-white">
              <ShieldCheck className="h-6 w-6 text-[#004ac6]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">SkillBridge Escrow Protocol</h3>
              <p className="text-xs leading-relaxed text-neutral-400">
                Your payment remains securely locked until you approve the delivered files. If the provider misses deadlines or delivers inadequate work, instant mediation or refunds apply.
              </p>
            </div>
          </div>

          {/* Reputation Breakdown */}
          <RatingBreakdown
            breakdown={breakdown}
            title={`Verified Reviews (${breakdown.totalReviews})`}
          />

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-10 text-center text-xs text-neutral-500">
                No peer reviews yet for this listing. Be the first to collaborate!
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

        {/* Sidebar: Order Box & Provider Card (Right 4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          {/* Order Action Card */}
          <div className="rounded-3xl border border-neutral-900 bg-white p-8 shadow-lg space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#004ac6]">
                Instant Booking
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                Escrow Protected
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                Total Budget
              </span>
              <p className="text-3xl font-black tracking-tight text-neutral-950 font-mono mt-1">
                ₹{service.price.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Delivered in {service.delivery_days || 3} days · Revisions included
              </p>
            </div>

            {!isOwner ? (
              <div className="space-y-3">
                {isOrderingDisabled ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                    <p className="text-xs font-bold text-amber-900">
                      Orders Currently {service.status === 'paused' ? 'Paused' : 'Unavailable'}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      This provider is not accepting new requests right now.
                    </p>
                    <Button disabled className="w-full mt-3 bg-neutral-200 text-neutral-400 rounded-xl">
                      Unavailable
                    </Button>
                  </div>
                ) : isConsultationService(service) ? (
                  <div className="space-y-3">
                    <Button
                      onClick={() => setBookingOpen(true)}
                      className="w-full h-12 rounded-xl bg-[#004ac6] text-sm font-bold text-white hover:bg-[#003da8] shadow-md group"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Consultation Slot
                    </Button>
                    <p className="text-center text-[11px] text-neutral-400">
                      Reserve a verified peer consultation slot.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={() => setCheckoutOpen(true)}
                      className="w-full h-12 rounded-xl bg-[#004ac6] text-sm font-bold text-white hover:bg-[#003da8] shadow-md group"
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Order & Lock Escrow
                    </Button>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                      <span>Locked safely in escrow</span>
                      <Link
                        href={`/checkout?serviceId=${service.id}`}
                        className="font-bold text-[#004ac6] hover:underline"
                      >
                        Checkout page →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs font-semibold text-neutral-700 text-center">
                  You are the owner of this service ({service.status}).
                </div>
                <Link href={`/services/${service.id}/edit`}>
                  <Button className="w-full h-11 rounded-xl bg-neutral-950 text-white hover:bg-black font-bold text-xs">
                    <Edit3 className="h-4 w-4 mr-1.5" />
                    Edit This Listing
                  </Button>
                </Link>
              </div>
            )}

            <div className="pt-4 border-t border-neutral-100 space-y-2 text-xs text-neutral-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Zero commission for student clients</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Full refund if provider fails to deliver</span>
              </div>
            </div>
          </div>

          {/* Provider Card */}
          {service.provider && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-xs space-y-5">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                // Student Provider
              </h2>

              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border border-neutral-200">
                  {service.provider.avatar_url && (
                    <AvatarImage src={service.provider.avatar_url} alt={service.provider.full_name} />
                  )}
                  <AvatarFallback className="bg-neutral-100 font-bold text-neutral-900">
                    {providerInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-neutral-900 truncate">
                    {service.provider.full_name}
                  </h3>
                  {service.provider.college && (
                    <p className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5 truncate">
                      <GraduationCap className="h-3.5 w-3.5 text-[#004ac6]" />
                      {service.provider.college}
                    </p>
                  )}
                </div>
              </div>

              <Link href={`/profile/${service.provider.id}`}>
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-xl text-xs font-bold border-neutral-300 hover:bg-neutral-50"
                >
                  View Profile & Past Work
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