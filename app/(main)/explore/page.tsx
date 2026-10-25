'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Search,
  Sparkles,
  ShieldCheck,
  Star,
  Clock,
  X,
  SlidersHorizontal,
  ArrowUpRight,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPublishedServices, type ExploreFilters } from '@/lib/services/services';
import { getCategories } from '@/lib/services/categories';
import { performAISearch } from '@/lib/ai/semantic-search';
import { VerifiedBadge } from '@/components/trust/verified-badge';
import { editorialEase } from '@/components/motion/motion-tokens';
import type { Service, Category, AISearchResult } from '@/types';

const SUGGESTED_QUERIES = [
  'Edit a 5-minute video with cinematic transitions',
  'Build a Next.js website with database & auth',
  'DSA tutoring for Trees & DP placement prep',
  'UI/UX design for a mobile food delivery app',
  'College event photography with Lightroom editing',
];

function ExploreContent() {
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || null;

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState<string | null>(initialCategory);
  const [sort, setSort] = useState<ExploreFilters['sort']>('newest');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // AI Semantic discovery state
  const [aiIntent, setAiIntent] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isAiEnhanced, setIsAiEnhanced] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [aiResultsMap, setAiResultsMap] = useState<Record<string, AISearchResult>>({});
  const [isSearchingAI, setIsSearchingAI] = useState(false);

  // Synchronize state when URL search parameters change
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== query) {
      setQuery(q);
    }
    const cat = searchParams.get('category');
    if (cat !== null && cat !== categoryId) {
      setCategoryId(cat);
    }
  }, [searchParams]);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const minP =
        minPrice.trim() !== '' && !isNaN(Number(minPrice)) ? Number(minPrice) : undefined;
      const maxP =
        maxPrice.trim() !== '' && !isNaN(Number(maxPrice)) ? Number(maxPrice) : undefined;

      const all = await getPublishedServices({
        category_id: categoryId,
        min_price: minP,
        max_price: maxP,
        sort,
        verifiedOnly,
      });

      if (query.trim()) {
        setIsSearchingAI(true);
        const aiResponse = await performAISearch(query, all, {
          categoryId,
          minPrice: minP,
          maxPrice: maxP,
        });

        setAiIntent(aiResponse.intent);
        setAiExplanation(aiResponse.explanation);
        setIsAiEnhanced(Boolean(aiResponse.isAiEnhanced));
        setExtractedSkills(aiResponse.extractedSkills || []);

        const map: Record<string, AISearchResult> = {};
        aiResponse.results.forEach((r) => {
          map[r.service.id] = r;
        });
        setAiResultsMap(map);
        setServices(aiResponse.results.map((r) => r.service));
      } else {
        setAiIntent(null);
        setAiExplanation(null);
        setIsAiEnhanced(false);
        setExtractedSkills([]);
        setAiResultsMap({});
        setServices(all);
      }
    } catch (err) {
      console.error('Failed to load published services:', err);
    } finally {
      setLoading(false);
      setIsSearchingAI(false);
    }
  }, [query, categoryId, sort, verifiedOnly, minPrice, maxPrice]);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  // 400ms debounce
  useEffect(() => {
    const timer = setTimeout(fetchServices, 400);
    return () => clearTimeout(timer);
  }, [fetchServices]);

  const handleResetFilters = () => {
    setQuery('');
    setCategoryId(null);
    setVerifiedOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12 py-12 sm:py-16">
      {/* Editorial Page Header */}
      <div className="mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-300/80 bg-white/80 px-3.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-neutral-700">
          <Sparkles className="h-3.5 w-3.5 text-[#004ac6]" />
          Semantic Discovery // Campus Catalog
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-950">
          Explore Student Services.
        </h1>
        <p className="text-base text-neutral-600 max-w-2xl font-normal leading-relaxed">
          Describe what you need naturally or filter by specialized college disciplines. Our AI connects you with verified peer talent.
        </p>
      </div>

      {/* Search Bar & Primary Filter Controls */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Natural language query input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              id="search-input"
              placeholder="e.g. 'I need someone to edit a 5-minute video with cinematic transitions'..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 w-full rounded-2xl border border-neutral-300/90 bg-white pl-11 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-2xs focus-visible:border-neutral-900 focus-visible:ring-0"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 hover:text-neutral-900"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort & Verification Selectors */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as ExploreFilters['sort'])}
              className="h-12 rounded-2xl border border-neutral-300/90 bg-white px-4 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-neutral-900 shadow-2xs cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="rating">Top Rated</option>
              <option value="price_low">Price: Low → High</option>
              <option value="price_high">Price: High → Low</option>
            </select>

            {/* Verified Student Filter */}
            <button
              id="verified-only-button"
              type="button"
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`h-12 flex items-center gap-2 rounded-2xl border px-4 text-xs font-bold transition-all shadow-2xs select-none ${
                verifiedOnly
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-bold'
                  : 'border-neutral-300/90 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Verified Only</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter Row: Price Inputs & Clear Filter */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 shadow-2xs">
            <SlidersHorizontal className="h-3.5 w-3.5 text-neutral-400" />
            <span className="font-semibold text-neutral-500 uppercase font-mono text-[11px]">Price:</span>
            <input
              id="min-price-input"
              type="number"
              placeholder="Min ₹"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-16 rounded border border-neutral-200 px-2 py-0.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
            <span className="text-neutral-400">–</span>
            <input
              id="max-price-input"
              type="number"
              placeholder="Max ₹"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-16 rounded border border-neutral-200 px-2 py-0.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
            {(minPrice || maxPrice) && (
              <button
                type="button"
                onClick={() => {
                  setMinPrice('');
                  setMaxPrice('');
                }}
                className="ml-1 text-[11px] text-neutral-400 hover:text-red-500"
                title="Clear price filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {(query || categoryId || verifiedOnly || minPrice || maxPrice) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-950 hover:border-neutral-500 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Prompt Suggestions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-mono font-medium text-neutral-400">
            Suggested Prompts:
          </span>
          {SUGGESTED_QUERIES.map((sq) => (
            <button
              key={sq}
              type="button"
              onClick={() => setQuery(sq)}
              className="rounded-full border border-neutral-200 bg-white/90 px-3 py-1 text-xs text-neutral-600 transition-all hover:border-neutral-800 hover:text-neutral-950 shadow-2xs"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* AI Intent & Explanation Banner */}
        {aiIntent && (
          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 text-xs text-neutral-800 shadow-2xs animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-[#004ac6] shrink-0 mt-0.5" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#004ac6]">
                      Understood Intent: {aiIntent}
                    </span>
                    {isAiEnhanced ? (
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#004ac6]">
                        NVIDIA Nemotron AI
                      </span>
                    ) : (
                      <span className="rounded-md bg-neutral-200/80 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                        Local Semantic Hybrid
                      </span>
                    )}
                  </div>
                  {aiExplanation && (
                    <p className="text-neutral-600 mt-1 leading-relaxed">
                      {aiExplanation}
                    </p>
                  )}
                </div>
              </div>
              {isSearchingAI && (
                <span className="text-[11px] text-[#004ac6] animate-pulse font-bold shrink-0">
                  Ranking Listings...
                </span>
              )}
            </div>

            {extractedSkills.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-blue-200/60">
                <span className="text-[11px] font-mono font-medium text-neutral-500">
                  Matched Skills:
                </span>
                {extractedSkills.map((sk) => (
                  <span
                    key={sk}
                    className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-800 border border-blue-100"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category Pills Navigation */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => setCategoryId(null)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              categoryId === null
                ? 'bg-neutral-950 text-white shadow-xs'
                : 'bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-900'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryId(cat.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                categoryId === cat.id
                  ? 'bg-neutral-950 text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-900'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count & Meta */}
      <div className="mb-6 flex items-center justify-between text-xs text-neutral-500 font-mono">
        <span>
          SHOWING <strong>{services.length}</strong> ACTIVE SERVICES
          {verifiedOnly ? ' (VERIFIED PROVIDERS ONLY)' : ''}
        </span>
      </div>

      {/* Results Grid / Loading / Empty */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-3xl border border-neutral-200 bg-white"
            />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-neutral-200 bg-white py-24 text-center px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 mb-4">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900">
            No campus services match your criteria
          </h3>
          <p className="mt-2 text-sm text-neutral-500 max-w-sm leading-relaxed">
            Try adjusting your search query, clearing category or price constraints, or explore our curated skills.
          </p>
          <Button
            onClick={handleResetFilters}
            className="mt-6 rounded-xl bg-neutral-950 px-5 text-xs font-bold text-white hover:bg-black"
          >
            Reset All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc, idx) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              index={idx}
              aiMatch={aiResultsMap[svc.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12 py-16">
          <div className="h-10 w-72 animate-pulse bg-neutral-200 rounded-xl mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-3xl border border-neutral-200 bg-white"
              />
            ))}
          </div>
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}

function ServiceCard({
  service,
  index,
  aiMatch,
}: {
  service: Service;
  index: number;
  aiMatch?: AISearchResult;
}) {
  const num = (index + 1).toString().padStart(2, '0');

  return (
    <Link
      href={`/services/${service.id}`}
      className="group relative flex flex-col justify-between rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-7 transition-all duration-300 hover:border-neutral-900 hover:bg-white hover:shadow-xl"
    >
      <div>
        {/* Top Badges & Numbering */}
        <div className="flex items-center justify-between gap-2 pb-5 border-b border-neutral-200/60">
          <span className="text-xs font-mono font-bold text-neutral-400 group-hover:text-[#004ac6] transition-colors">
            {num} // {service.category?.name || 'CAMPUS SKILL'}
          </span>

          {service.provider?.verification_status === 'verified' && (
            <VerifiedBadge
              college={service.provider.college}
              size="sm"
              showLabel={false}
            />
          )}
        </div>

        {/* Title */}
        <h3 className="mt-5 text-xl font-bold tracking-tight text-neutral-900 group-hover:text-[#004ac6] transition-colors line-clamp-2 leading-snug">
          {service.title}
        </h3>

        {/* Description */}
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 line-clamp-3">
          {service.description}
        </p>

        {/* AI Match Reasons */}
        {aiMatch && aiMatch.match_reasons.length > 0 && (
          <div className="mt-4 rounded-xl bg-blue-50/80 p-2.5 text-[11px] text-[#004ac6] border border-blue-100 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-medium">{aiMatch.match_reasons.join(' · ')}</span>
          </div>
        )}
      </div>

      <div className="mt-6 pt-5 border-t border-neutral-200/60">
        {/* Provider Info */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="min-w-0">
            <p className="text-xs font-bold text-neutral-900 truncate">
              {service.provider?.full_name ?? 'Student Provider'}
            </p>
            {service.provider?.college && (
              <p className="text-[11px] text-neutral-400 truncate flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                {service.provider.college}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-neutral-900">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{service.rating ?? 4.9}</span>
            <span className="text-[11px] text-neutral-400 font-normal">
              ({service.completed_orders_count || 12})
            </span>
          </div>
        </div>

        {/* Price & Delivery */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
              Starting at
            </span>
            <span className="text-xl font-black tracking-tight text-neutral-950 font-mono">
              ₹{service.price.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs font-semibold text-neutral-500">
              <Clock className="h-3.5 w-3.5 text-neutral-400" />
              {service.delivery_days || 3}d
            </span>
            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-neutral-100 text-neutral-900 group-hover:bg-[#004ac6] group-hover:text-white transition-colors">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}