'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  MapPin,
  Star,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Briefcase,
  Layers,
  Globe,
  Github,
  Linkedin,
  ArrowUpRight,
  Sparkles,
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
import { Reveal, StaggerReveal } from '@/components/motion/reveal';
import { editorialEase } from '@/components/motion/motion-tokens';
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
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 animate-pulse">
        <div className="h-4 w-28 bg-neutral-200 rounded mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 h-96 bg-neutral-200/60 rounded-3xl" />
          <div className="lg:col-span-8 space-y-6">
            <div className="h-10 w-64 bg-neutral-200/70 rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-48 bg-neutral-200/50 rounded-2xl" />
              <div className="h-48 bg-neutral-200/50 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-20">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-sm">
          <p className="text-xl font-bold text-neutral-900 tracking-tight">Student Profile Not Found</p>
          <p className="text-xs text-neutral-500 mt-2 max-w-sm">
            The requested campus student record does not exist or may have been unlisted.
          </p>
          <Link href="/explore">
            <Button className="mt-6 bg-[#004ac6] text-white hover:bg-[#003da6] text-xs font-semibold rounded-full px-6">
              Return to Catalog
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
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Top Nav Back */}
      <Reveal>
        <div className="mb-8">
          <Link
            href="/explore"
            className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Back to Explore Catalog
          </Link>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
        {/* Left Column: Student Dossier (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Reveal>
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm text-center relative overflow-hidden">
              {/* Subtle ambient accent background bar */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#004ac6] via-indigo-500 to-sky-400" />

              <Avatar className="h-24 w-24 mx-auto border-2 border-neutral-200/80 shadow-sm mt-2">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="text-2xl font-black text-[#004ac6] bg-neutral-100">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="mt-4">
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  {profile.full_name}
                </h1>
                {profile.college && (
                  <p className="text-xs text-neutral-600 flex items-center justify-center gap-1.5 mt-1.5 font-medium">
                    <GraduationCap className="h-3.5 w-3.5 text-[#004ac6]" />
                    {profile.college}
                  </p>
                )}
                {profile.location && (
                  <p className="text-xs text-neutral-400 flex items-center justify-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {profile.location}
                  </p>
                )}
              </div>

              {isVerified && (
                <div className="mt-3 flex justify-center">
                  <VerifiedBadge college={profile.college ?? 'Campus'} size="md" />
                </div>
              )}

              {/* Metrics Strip */}
              <div className="mt-6 grid grid-cols-2 gap-3 border-y border-neutral-100 py-4 text-center">
                <div className="border-r border-neutral-100 pr-2">
                  <span className="text-xl font-black text-neutral-900 flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {profile.rating ?? 4.9}
                  </span>
                  <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mt-0.5">
                    Rating ({reviews.length})
                  </span>
                </div>
                <div className="pl-2">
                  <span className="text-xl font-black text-[#004ac6]">
                    {profile.completed_orders_count ?? 15}
                  </span>
                  <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mt-0.5">
                    Orders Done
                  </span>
                </div>
              </div>

              {/* Pricing Preferences */}
              {profile.pricing_preferences && (
                <div className="mt-4 rounded-2xl bg-neutral-50 p-3.5 border border-neutral-200/60 text-xs flex items-center justify-around">
                  {profile.pricing_preferences.starting_price && (
                    <div>
                      <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider">
                        Starts at
                      </span>
                      <strong className="text-base font-black text-neutral-900">
                        ₹{profile.pricing_preferences.starting_price}
                      </strong>
                    </div>
                  )}
                  {profile.pricing_preferences.hourly_rate && (
                    <div>
                      <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider">
                        Hourly rate
                      </span>
                      <strong className="text-base font-black text-[#004ac6]">
                        ₹{profile.pricing_preferences.hourly_rate}/hr
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {profile.bio && (
                <div className="mt-5 text-left bg-neutral-50/70 p-4 rounded-2xl border border-neutral-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    About
                  </span>
                  <p className="text-xs text-neutral-700 leading-relaxed">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Skills */}
              {profile.skills && profile.skills.length > 0 && (
                <div className="mt-5 text-left space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Verified Competencies
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-neutral-100 hover:bg-[#004ac6]/10 hover:text-[#004ac6] transition-colors px-3 py-1 text-xs font-semibold text-neutral-700 border border-neutral-200/60"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Portfolio Links */}
              {profile.portfolio_links && profile.portfolio_links.length > 0 && (
                <div className="mt-5 text-left space-y-2 pt-4 border-t border-neutral-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Portfolio & Project Work
                  </span>
                  <div className="space-y-1.5">
                    {profile.portfolio_links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between rounded-xl border border-neutral-200/80 p-2.5 text-xs font-semibold text-neutral-800 hover:border-[#004ac6] hover:text-[#004ac6] transition-all bg-neutral-50/40 hover:bg-white"
                      >
                        <span className="truncate pr-2">{link.title}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-[#004ac6] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Channels */}
              {profile.social_links &&
                (profile.social_links.github ||
                  profile.social_links.linkedin ||
                  profile.social_links.website) && (
                  <div className="mt-6 flex items-center justify-center gap-3 pt-4 border-t border-neutral-100 text-neutral-400">
                    {profile.social_links.github && (
                      <a
                        href={profile.social_links.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl border border-neutral-200 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                        title="GitHub"
                      >
                        <Github className="h-4 w-4" />
                      </a>
                    )}
                    {profile.social_links.linkedin && (
                      <a
                        href={profile.social_links.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl border border-neutral-200 hover:border-blue-600 hover:text-blue-600 transition-colors"
                        title="LinkedIn"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {profile.social_links.website && (
                      <a
                        href={profile.social_links.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl border border-neutral-200 hover:border-[#004ac6] hover:text-[#004ac6] transition-colors"
                        title="Website"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
            </div>
          </Reveal>
        </div>

        {/* Right Columns: Offerings & Community Reviews (8 cols) */}
        <div className="lg:col-span-8 space-y-10">
          {/* Active Services Showcase */}
          <div>
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Student Offerings
                </span>
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                  Services by {profile.full_name.split(' ')[0]}
                </h2>
              </div>
              <span className="text-xs font-semibold text-neutral-400">
                {services.length} Published
              </span>
            </div>

            {services.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center text-xs text-neutral-500">
                No active service listings published by this student yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map((svc) => (
                  <motion.div
                    key={svc.id}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.2, ease: editorialEase }}
                    className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm hover:border-neutral-300 hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2">
                        <span className="font-bold text-[#004ac6] uppercase tracking-wider">
                          {svc.category?.name ?? 'Discipline'}
                        </span>
                        <span>{svc.delivery_days}d turnaround</span>
                      </div>
                      <h3 className="font-bold text-neutral-900 text-sm line-clamp-2 leading-snug">
                        {svc.title}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-2 line-clamp-2 leading-relaxed">
                        {svc.description}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3.5">
                      <div>
                        <span className="text-[9px] text-neutral-400 block uppercase font-bold tracking-wider">
                          Fixed Rate
                        </span>
                        <span className="text-base font-black text-neutral-900">
                          ₹{svc.price}
                        </span>
                      </div>
                      <Link href={`/services/${svc.id}`}>
                        <Button
                          size="sm"
                          className="bg-neutral-900 text-white hover:bg-[#004ac6] text-xs font-semibold rounded-full px-4 h-8 transition-colors"
                        >
                          View Gig →
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Authoritative Rating Breakdown & Trust */}
          <Reveal>
            <RatingBreakdown
              breakdown={calculateRatingBreakdown(reviews)}
              title={`Peer Reputation & Evaluations (${reviews.length})`}
            />
          </Reveal>

          {/* Student Reviews Feed */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
              Verified Order Reviews
            </h3>

            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-xs text-neutral-500">
                No reviews recorded yet. Completed orders and peer evaluations will appear here.
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
