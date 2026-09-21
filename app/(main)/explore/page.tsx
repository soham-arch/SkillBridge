'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  ShieldCheck,
  Star,
  Clock,
  Filter,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPublishedServices, type ExploreFilters } from '@/lib/services/services';
import { getCategories } from '@/lib/services/categories';
import { performAISearch } from '@/lib/ai/semantic-search';
import { VerifiedBadge } from '@/components/trust/verified-badge';
import type { Service, Category, AISearchResult } from '@/types';

const SUGGESTED_QUERIES = [
  'Edit a 5-minute video with cinematic transitions',
  'Build a Next.js website with database & auth',
  'DSA tutoring for Trees & DP placement prep',
  'UI/UX design for a mobile food delivery app',
  'College event photography with Lightroom editing',
];

export default function ExplorePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<ExploreFilters['sort']>('newest');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // AI Semantic state
  const [aiIntent, setAiIntent] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiResultsMap, setAiResultsMap] = useState<Record<string, AISearchResult>>({});
  const [isSearchingAI, setIsSearchingAI] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getPublishedServices({
        category_id: categoryId,
        sort,
        verifiedOnly,
      });

      if (query.trim()) {
        setIsSearchingAI(true);
        const aiResponse = await performAISearch(query, all);
        setAiIntent(aiResponse.intent);
        setAiExplanation(aiResponse.explanation);

        const map: Record<string, AISearchResult> = {};
        aiResponse.results.forEach((r) => {
          map[r.service.id] = r;
        });
        setAiResultsMap(map);
        setServices(aiResponse.results.map((r) => r.service));
      } else {
        setAiIntent(null);
        setAiExplanation(null);
        setAiResultsMap({});
        setServices(all);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsSearchingAI(false);
    }
  }, [query, categoryId, sort, verifiedOnly]);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchServices, 300);
    return () => clearTimeout(timer);
  }, [fetchServices]);

  return (
    <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
      {/* Heading */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f4ff] px-3 py-1 text-xs font-semibold text-[#004ac6] mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          AI-Powered Semantic Discovery
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Explore Student Services</h1>
        <p className="mt-1 text-sm text-gray-600">
          Describe what you need naturally — our semantic AI connects you with verified peer talent.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="e.g. 'I need someone to edit a 5-minute video with cinematic transitions'..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 rounded-xl border-[#c3c6d7] bg-white pl-11 pr-10 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus-visible:ring-2 focus-visible:ring-[#004ac6]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ExploreFilters['sort'])}
              className="h-12 rounded-xl border border-[#c3c6d7] bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004ac6] shadow-sm"
            >
              <option value="newest">Newest First</option>
              <option value="rating">Top Rated</option>
              <option value="price_low">Price: Low → High</option>
              <option value="price_high">Price: High → Low</option>
            </select>

            <button
              type="button"
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`h-12 flex items-center gap-1.5 rounded-xl border px-4 text-xs font-semibold transition-all shadow-sm ${
                verifiedOnly
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-[#c3c6d7] bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Verified Students
            </button>
          </div>
        </div>

        {/* Suggested Queries */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400">Try asking:</span>
          {SUGGESTED_QUERIES.map((sq) => (
            <button
              key={sq}
              onClick={() => setQuery(sq)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition-colors hover:border-[#004ac6] hover:text-[#004ac6]"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* AI Intent & Explanation Banner */}
        {aiIntent && (
          <div className="rounded-xl border border-blue-100 bg-[#f4f7ff] p-3.5 text-xs text-gray-700 flex items-start justify-between gap-3 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-[#004ac6] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#004ac6]">Understood Intent: {aiIntent}</span>
                {aiExplanation && <p className="text-gray-600 mt-0.5">{aiExplanation}</p>}
              </div>
            </div>
            {isSearchingAI && (
              <span className="text-[11px] text-gray-400 animate-pulse font-medium">
                AI Ranking...
              </span>
            )}
          </div>
        )}

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => setCategoryId(null)}
            className={
              categoryId === null
                ? 'rounded-full bg-[#004ac6] text-white hover:bg-[#003b9e]'
                : 'rounded-full border border-[#c3c6d7] bg-white text-gray-700 hover:bg-gray-50 shadow-none'
            }
            variant={categoryId === null ? 'default' : 'outline'}
          >
            All Categories
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              size="sm"
              onClick={() => setCategoryId(cat.id)}
              className={
                categoryId === cat.id
                  ? 'rounded-full bg-[#004ac6] text-white hover:bg-[#003b9e]'
                  : 'rounded-full border border-[#c3c6d7] bg-white text-gray-700 hover:bg-gray-50 shadow-none'
              }
              variant={categoryId === cat.id ? 'default' : 'outline'}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 flex items-center justify-between text-xs text-gray-500">
        <span>
          Showing <strong>{services.length}</strong> services
          {verifiedOnly ? ' from verified students' : ''}
        </span>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-white" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#c3c6d7] bg-white py-24 text-center">
          <Search className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-lg font-bold text-gray-700">No services match your query</p>
          <p className="mt-1 text-xs text-gray-500 max-w-sm">
            Try adjusting your search keywords, clear category filters, or browse all student skills.
          </p>
          <Button
            onClick={() => {
              setQuery('');
              setCategoryId(null);
              setVerifiedOnly(false);
            }}
            className="mt-4 bg-[#004ac6] text-white"
          >
            Reset All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => (
            <ServiceCard key={svc.id} service={svc} aiMatch={aiResultsMap[svc.id]} />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({ service, aiMatch }: { service: Service; aiMatch?: AISearchResult }) {
  return (
    <Link
      href={`/services/${service.id}`}
      className="group flex flex-col justify-between rounded-2xl border border-border bg-white p-6 shadow-sm transition-all hover:border-[#004ac6]/40 hover:shadow-lg relative overflow-hidden"
    >
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          {service.category && (
            <Badge
              variant="secondary"
              className="rounded-full bg-[#f0f4ff] px-2.5 py-0.5 text-[11px] font-semibold text-[#004ac6]"
            >
              {service.category.name}
            </Badge>
          )}

          {service.provider?.verification_status === 'verified' && (
            <VerifiedBadge college={service.provider.college} size="sm" showLabel={false} />
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-gray-900 group-hover:text-[#004ac6] transition-colors line-clamp-2">
          {service.title}
        </h3>

        {/* Description */}
        <p className="mt-2 text-xs leading-relaxed text-gray-600 line-clamp-2">
          {service.description}
        </p>

        {/* AI Match Reasons if present */}
        {aiMatch && aiMatch.match_reasons.length > 0 && (
          <div className="mt-3 rounded-lg bg-blue-50/60 p-2 text-[11px] text-blue-900 border border-blue-100 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-[#004ac6] shrink-0" />
            <span className="truncate">{aiMatch.match_reasons.join(' · ')}</span>
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4">
        {/* Provider info */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-800 truncate">
              {service.provider?.full_name ?? 'Student Provider'}
            </p>
            {service.provider?.college && (
              <p className="text-[11px] text-gray-400 truncate">{service.provider.college}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-gray-800">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{service.rating ?? 4.9}</span>
            <span className="text-[11px] text-gray-400 font-normal">
              ({service.completed_orders_count || 12})
            </span>
          </div>
        </div>

        {/* Price & Delivery */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 block">Starting at</span>
            <span className="text-lg font-extrabold text-[#004ac6]">
              ₹{service.price.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
            <Clock className="h-3.5 w-3.5 text-[#004ac6]" />
            {service.delivery_days || 3}d delivery
          </span>
        </div>
      </div>
    </Link>
  );
}