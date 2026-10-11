'use client';

import { Star, ShieldCheck } from 'lucide-react';
import { RatingBreakdown as RatingBreakdownType } from '@/types';

interface RatingBreakdownProps {
  breakdown: RatingBreakdownType;
  title?: string;
}

export function RatingBreakdown({ breakdown, title = 'Student Rating & Reputation' }: RatingBreakdownProps) {
  const { averageRating, totalReviews, counts, percentages } = breakdown;

  return (
    <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {title}
          </h2>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-gray-900">
              {totalReviews > 0 ? averageRating.toFixed(1) : '—'}
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(averageRating) && totalReviews > 0
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Based on {totalReviews} {totalReviews === 1 ? 'verified review' : 'verified reviews'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 border border-emerald-100">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>100% Real Completed Orders</span>
        </div>
      </div>

      {/* Breakdown Bars */}
      <div className="space-y-2.5 pt-2 border-t border-gray-100">
        {[5, 4, 3, 2, 1].map((star) => {
          const starCount = counts[star as keyof typeof counts] || 0;
          const starPct = percentages[star as keyof typeof percentages] || 0;

          return (
            <div key={star} className="flex items-center gap-3 text-xs">
              <span className="w-12 font-medium text-gray-600 flex items-center gap-1">
                {star} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              </span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300 rounded-full"
                  style={{ width: `${starPct}%` }}
                />
              </div>
              <span className="w-10 text-right text-gray-400 font-medium">{starPct}%</span>
              <span className="w-8 text-right text-gray-500 font-bold text-[11px]">({starCount})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
