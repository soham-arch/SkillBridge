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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getMarketplaceState } from '@/lib/store/marketplace-store';
import { VerifiedBadge } from '@/components/trust/verified-badge';
import { Profile, Service, Review } from '@/types';

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const state = getMarketplaceState();
    const prof = state.profiles.find((p) => p.user_id === params.id || p.id === params.id);
    setProfile(prof ?? null);

    if (prof) {
      const userServices = state.services
        .filter((s) => s.provider_id === prof.user_id && s.status === 'published')
        .map((s) => ({
          ...s,
          category: state.categories.find((c) => c.id === s.category_id) ?? null,
        }));
      setServices(userServices);

      const userReviews = state.reviews
        .filter((r) => r.reviewee_id === prof.user_id)
        .map((r) => ({
          ...r,
          reviewer: state.profiles.find((p) => p.user_id === r.reviewer_id) ?? null,
        }));
      setReviews(userReviews);
    }
    setLoading(false);
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
          <Link href="/explore">
            <Button className="mt-4 bg-[#004ac6] text-white">Back to Explore</Button>
          </Link>
        </div>
      </div>
    );
  }

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

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
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm text-center space-y-4">
            <Avatar className="h-24 w-24 mx-auto border-2 border-[#c3c6d7]">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="text-2xl font-bold text-[#004ac6]">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
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

            {profile.verification_status === 'verified' && (
              <div className="flex justify-center">
                <VerifiedBadge college={profile.college} size="md" />
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

            {profile.bio && (
              <p className="text-xs text-gray-600 leading-relaxed text-left bg-gray-50 p-4 rounded-xl">
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
                  Portfolio & Work
                </h3>
                <div className="space-y-1.5">
                  {profile.portfolio_links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-2 text-xs font-semibold text-gray-700 hover:border-[#004ac6] hover:text-[#004ac6] transition-colors"
                    >
                      <span>{link.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                    </a>
                  ))}
                </div>
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
                No active services listed currently.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map((svc) => (
                  <Link
                    key={svc.id}
                    href={`/services/${svc.id}`}
                    className="group flex flex-col justify-between rounded-2xl border border-border bg-white p-6 shadow-sm transition-all hover:border-[#004ac6]/40 hover:shadow-md"
                  >
                    <div>
                      {svc.category && (
                        <Badge
                          variant="secondary"
                          className="mb-2 rounded-full bg-[#f0f4ff] px-2.5 py-0.5 text-xs font-semibold text-[#004ac6]"
                        >
                          {svc.category.name}
                        </Badge>
                      )}
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-[#004ac6] transition-colors line-clamp-1">
                        {svc.title}
                      </h3>
                      <p className="mt-1 text-xs text-gray-600 line-clamp-2">{svc.description}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                      <span className="text-base font-extrabold text-[#004ac6]">
                        ₹{svc.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-semibold text-[#004ac6] group-hover:underline">
                        View Service →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Genuine Reviews */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Student Reviews ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500 bg-white p-6 rounded-2xl border">
                No reviews yet for this student.
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-[#c3c6d7]">
                          {rev.reviewer?.avatar_url && (
                            <AvatarImage src={rev.reviewer.avatar_url} />
                          )}
                          <AvatarFallback className="text-xs font-bold text-[#004ac6]">
                            {rev.reviewer?.full_name?.slice(0, 2).toUpperCase() ?? 'ST'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {rev.reviewer?.full_name ?? 'Student Customer'}
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
                            className={`h-3.5 w-3.5 ${
                              i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 italic">&ldquo;{rev.comment}&rdquo;</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
