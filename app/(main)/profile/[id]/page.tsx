'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  MapPin,
  Star,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  IndianRupee,
  Briefcase,
  Layers,
  Globe,
  Github,
  Linkedin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getMarketplaceState } from '@/lib/store/marketplace-store';
import { fetchSellerReviews, calculateRatingBreakdown } from '@/lib/services/reviews';
import { RatingBreakdown } from '@/components/reviews/rating-breakdown';
import { ReviewCard } from '@/components/reviews/review-card';
import { VerifiedBadge } from '@/components/trust/verified-badge';
import { Profile, Service, Review } from '@/types';

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPublicProfile() {
      try {
        const supabase = getSupabaseClient();

        // 1. Fetch Profile from Supabase
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('*')
          .or(`user_id.eq.${params.id},id.eq.${params.id}`)
          .maybeSingle();

        let prof: Profile | null = dbProfile as Profile | null;

        // Fallback to local store if not found in db
        if (!prof) {
          const state = getMarketplaceState();
          prof = state.profiles.find((p) => p.user_id === params.id || p.id === params.id) ?? null;
        }

        setProfile(prof);

        if (prof) {
          // 2. Fetch Published Services
          const { data: dbServices } = await supabase
            .from('services')
            .select(`
              *,
              category:categories!services_category_id_fkey(*)
            `)
            .eq('provider_id', prof.user_id)
            .eq('status', 'published');

          if (dbServices && dbServices.length > 0) {
            setServices(dbServices as Service[]);
          } else {
            const state = getMarketplaceState();
            const userServices = state.services
              .filter((s) => s.provider_id === prof?.user_id && s.status === 'published')
              .map((s) => ({
                ...s,
                category: state.categories.find((c) => c.id === s.category_id) ?? null,
              }));
            setServices(userServices);
          }

          // 3. Fetch Reviews from Authoritative Database
          const userReviews = await fetchSellerReviews(prof.user_id);
          setReviews(userReviews);
        }
      } catch (err) {
        console.error('Failed to load public profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPublicProfile();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
          <p className="text-lg font-bold text-gray-700">Student Profile Not Found</p>
          <p className="text-xs text-gray-500 mt-1">The requested campus profile does not exist.</p>
          <Link href="/explore">
            <Button className="mt-4 bg-[#004ac6] text-white text-xs font-bold rounded-xl">
              Back to Explore
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const initials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ST';

  const isVerified = profile.verification_status === 'verified';

  return (
    <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
      {/* Top Back Link */}
      <div className="mb-6">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#004ac6]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Explore
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Student Bio & Info */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm text-center space-y-4">
            <Avatar className="h-24 w-24 mx-auto border-2 border-[#c3c6d7]">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="text-2xl font-bold text-[#004ac6]">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">{profile.full_name}</h1>
              {profile.college && (
                <p className="text-xs text-gray-600 flex items-center justify-center gap-1.5 mt-1 font-medium">
                  <GraduationCap className="h-4 w-4 text-[#004ac6]" />
                  {profile.college}
                </p>
              )}
              {profile.location && (
                <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.location}
                </p>
              )}
            </div>

            {isVerified && (
              <div className="flex justify-center">
                <VerifiedBadge college={profile.college ?? 'Campus'} size="md" />
              </div>
            )}

            {/* Reputation Metrics */}
            <div className="grid grid-cols-2 gap-2 border-t border-b border-gray-100 py-3 text-center">
              <div>
                <span className="text-lg font-bold text-gray-900 flex items-center justify-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {profile.rating ?? 4.9}
                </span>
                <span className="text-[11px] text-gray-400">Rating ({reviews.length})</span>
              </div>
              <div>
                <span className="text-lg font-bold text-[#004ac6]">
                  {profile.completed_orders_count ?? 15}
                </span>
                <span className="text-[11px] text-gray-400">Orders Done</span>
              </div>
            </div>

            {/* Pricing Rates */}
            {profile.pricing_preferences && (
              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 text-xs text-emerald-800 flex items-center justify-around">
                {profile.pricing_preferences.starting_price && (
                  <div>
                    <span className="text-[10px] text-emerald-600 block uppercase font-bold">Starts at</span>
                    <strong className="text-sm">₹{profile.pricing_preferences.starting_price}</strong>
                  </div>
                )}
                {profile.pricing_preferences.hourly_rate && (
                  <div>
                    <span className="text-[10px] text-emerald-600 block uppercase font-bold">Hourly rate</span>
                    <strong className="text-sm">₹{profile.pricing_preferences.hourly_rate}/hr</strong>
                  </div>
                )}
              </div>
            )}

            {profile.bio && (
              <p className="text-xs text-gray-600 leading-relaxed text-left bg-gray-50 p-4 rounded-2xl">
                {profile.bio}
              </p>
            )}

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="text-left space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#004ac6]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio Links */}
            {profile.portfolio_links && profile.portfolio_links.length > 0 && (
              <div className="text-left space-y-2 pt-2 border-t border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Portfolio & Showcases
                </h3>
                <div className="space-y-1.5">
                  {profile.portfolio_links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl border border-gray-200 p-2 text-xs font-semibold text-gray-700 hover:border-[#004ac6] hover:text-[#004ac6] transition-colors"
                    >
                      <span>{link.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            {profile.social_links && (profile.social_links.github || profile.social_links.linkedin || profile.social_links.website) && (
              <div className="flex items-center justify-center gap-3 pt-2 border-t border-gray-100 text-gray-500">
                {profile.social_links.github && (
                  <a href={profile.social_links.github} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900" title="GitHub">
                    <Github className="h-4 w-4" />
                  </a>
                )}
                {profile.social_links.linkedin && (
                  <a href={profile.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600" title="LinkedIn">
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
                {profile.social_links.website && (
                  <a href={profile.social_links.website} target="_blank" rel="noopener noreferrer" className="hover:text-[#004ac6]" title="Website">
                    <Globe className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Services & Reviews */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Services */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Services by {profile.full_name.split(' ')[0]} ({services.length})
            </h2>

            {services.length === 0 ? (
              <p className="text-sm text-gray-500 bg-white p-6 rounded-2xl border">
                No active service listings published by this student yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span className="font-semibold text-[#004ac6]">{svc.category?.name ?? 'Service'}</span>
                        <span>{svc.delivery_days}d delivery</span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm line-clamp-2">{svc.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{svc.description}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Price</span>
                        <span className="text-base font-extrabold text-emerald-600">₹{svc.price}</span>
                      </div>
                      <Link href={`/services/${svc.id}`}>
                        <Button size="sm" className="bg-[#004ac6] text-white hover:bg-[#003899] text-xs font-bold rounded-xl">
                          View Service
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Authoritative Rating Breakdown & Trust */}
          <RatingBreakdown
            breakdown={calculateRatingBreakdown(reviews)}
            title={`Campus Reviews & Reputation (${reviews.length})`}
          />

          {/* Student Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-500">
                No reviews recorded yet. Completed orders and peer feedback will appear here.
              </div>
            ) : (
              reviews.map((rev) => (
                <ReviewCard
                  key={rev.id}
                  review={rev}
                  onReportSubmitted={async () => {
                    if (profile?.user_id) {
                      const fresh = await fetchSellerReviews(profile.user_id);
                      setReviews(fresh);
                    }
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
