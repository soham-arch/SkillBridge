'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Star,
  Zap,
  ArrowUpRight,
  Lock,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/auth-context';
import { getPublishedServices } from '@/lib/services/services';
import { getCategories } from '@/lib/services/categories';
import { KineticBanner } from '@/components/motion/kinetic-banner';
import { StickyStorySection } from '@/components/motion/sticky-story';
import { HorizontalShowcase } from '@/components/motion/horizontal-showcase';
import { AnimatedCounter } from '@/components/motion/animated-counter';
import { Reveal, StaggerReveal, StaggerItem } from '@/components/motion/reveal';
import { editorialEase } from '@/components/motion/motion-tokens';
import type { Service, Category } from '@/types';

const QUICK_SEARCH_CHIPS = [
  'Edit a college fest video',
  'Build a Next.js website',
  'Figma UI/UX prototype',
  'DSA placement tutor',
  'Lightroom event photography',
];

export default function LandingPage() {
  const router = useRouter();
  const { session } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [query, setQuery] = useState('');
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [servicesRes, catsRes] = await Promise.allSettled([
          getPublishedServices(),
          getCategories(),
        ]);
        if (servicesRes.status === 'fulfilled') {
          setFeaturedServices(servicesRes.value.slice(0, 4));
        }
        if (catsRes.status === 'fulfilled') {
          setCategories(catsRes.value.slice(0, 6));
        }
      } catch (err) {
        console.error('Failed to load landing data', err);
      } finally {
        setLoadingServices(false);
      }
    }
    loadData();
  }, []);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      router.push('/explore');
      return;
    }
    router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
  }

  function handleChipClick(chipText: string) {
    router.push(`/explore?q=${encodeURIComponent(chipText)}`);
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#faf9f6] text-neutral-900 selection:bg-[#004ac6] selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-200/60 bg-[#faf9f6]/90 backdrop-blur-md">
        <nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-12">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-2xl font-black tracking-tight text-neutral-950"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#004ac6] transition-transform duration-300 group-hover:scale-125" />
            <span>SkillBridge</span>
            <span className="hidden sm:inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 border border-neutral-200 rounded-md px-1.5 py-0.5">
              Campus
            </span>
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/explore"
              className="text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-neutral-950 transition-colors hidden sm:block"
            >
              Explore Skills
            </Link>

            {session ? (
              <Button
                onClick={() => router.push('/dashboard')}
                className="h-10 rounded-xl bg-neutral-950 px-5 text-xs font-bold text-white hover:bg-black shadow-xs"
              >
                Go to Dashboard
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            ) : (
              <div className="flex items-center gap-2.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="text-xs font-bold text-neutral-700 hover:text-neutral-950"
                >
                  Log In
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push('/register')}
                  className="rounded-xl bg-[#004ac6] px-4 text-xs font-bold text-white hover:bg-[#003da8] shadow-xs"
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Editorial Hero Section */}
        <section className="relative overflow-hidden pt-16 sm:pt-24 pb-20 sm:pb-28 border-b border-neutral-200/80">
          {/* Subtle Ambient Background Element */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-[#004ac6]/6 via-blue-500/4 to-transparent blur-3xl pointer-events-none rounded-full" />

          <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 flex flex-col items-center text-center">
            {/* Eyebrow Label */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: editorialEase }}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300/80 bg-white/80 px-4 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-neutral-700 shadow-2xs backdrop-blur-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#004ac6]" />
              AI-Powered Student Skill Marketplace // Campus Beta
            </motion.div>

            {/* Main Editorial Headline */}
            <motion.h1
              initial={shouldReduceMotion ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: editorialEase }}
              className="mt-8 max-w-5xl text-4xl sm:text-6xl lg:text-7xl xl:text-[82px] font-black tracking-tight text-neutral-950 leading-[0.98]"
            >
              Find the right skill.{' '}
              <span className="text-neutral-400 font-light block sm:inline">
                Build the right thing.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: editorialEase }}
              className="mt-6 max-w-2xl text-base sm:text-lg lg:text-xl text-neutral-600 leading-relaxed font-normal"
            >
              SkillBridge connects ambitious college students to request and deliver verified deliverables—from cinematic video editing to full-stack Next.js apps and placement tutoring.
            </motion.p>

            {/* Search Input Bar */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: editorialEase }}
              className="w-full max-w-2xl mt-10"
            >
              <form
                onSubmit={handleSearchSubmit}
                className="group relative flex items-center rounded-2xl border border-neutral-300/90 bg-white p-2 shadow-lg transition-all duration-300 focus-within:border-neutral-900 focus-within:shadow-xl"
              >
                <Search className="ml-3 h-5 w-5 text-neutral-400 transition-colors group-focus-within:text-neutral-900" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Describe what you need (e.g. 'Next.js developer', 'fest video editor')..."
                  className="h-12 w-full border-0 bg-transparent px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-0 shadow-none font-medium"
                />
                <Button
                  type="submit"
                  className="h-10 gap-1.5 rounded-xl bg-neutral-950 px-5 text-xs font-bold text-white hover:bg-black transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#004ac6]" />
                  Search AI
                </Button>
              </form>

              {/* Quick Search Chips */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs font-mono font-medium text-neutral-400">
                  Popular:
                </span>
                {QUICK_SEARCH_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className="rounded-full border border-neutral-200/90 bg-white/90 px-3 py-1 text-xs text-neutral-600 transition-all hover:border-neutral-800 hover:text-neutral-950 hover:bg-white shadow-2xs"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Dual Action CTAs */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: editorialEase }}
              className="mt-8 flex flex-col sm:flex-row items-center gap-3.5"
            >
              <Button
                onClick={() => router.push('/explore')}
                className="h-12 rounded-xl bg-[#004ac6] px-8 text-sm font-bold text-white hover:bg-[#003da8] shadow-md group"
              >
                Find a Skill
                <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(session ? '/services/create' : '/register')}
                className="h-12 rounded-xl border border-neutral-300 bg-white px-8 text-sm font-bold text-neutral-800 hover:bg-neutral-100 hover:border-neutral-900"
              >
                Offer Your Expertise
              </Button>
            </motion.div>

            {/* Key Platform Metrics */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="mt-16 pt-12 border-t border-neutral-200/70 grid grid-cols-2 sm:grid-cols-4 gap-8 w-full max-w-4xl"
            >
              <div className="text-center sm:text-left">
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 font-mono">
                  <AnimatedCounter value={450} prefix="₹" suffix="K+" />
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Escrow Protected
                </p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 font-mono">
                  <AnimatedCounter value={1250} suffix="+" />
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Orders Delivered
                </p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 font-mono">
                  <AnimatedCounter value={99} suffix=".4%" />
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Satisfaction Rate
                </p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 font-mono">
                  &lt; 48h
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Avg. Turnaround
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Kinetic Scrolling Typography Banner */}
        <KineticBanner
          words={['DISCOVER', 'COLLABORATE', 'ESCROW PROTECTED', 'DELIVER', 'PREVIEW', 'GROW']}
        />

        {/* Curated Disciplines Showcase (Horizontal on Desktop) */}
        <HorizontalShowcase />

        {/* Sticky Storytelling Section */}
        <StickyStorySection />

        {/* Featured Real Listings / Services Section */}
        <section className="w-full border-t border-neutral-200/80 bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-12 border-b border-neutral-200/80">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#004ac6]">
                  <span>//</span> Verified Campus Talent
                </div>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-950">
                  Featured Services.
                </h2>
              </div>
              <Link
                href="/explore"
                className="group flex items-center gap-2 text-sm font-bold text-neutral-900 hover:text-[#004ac6] transition-colors"
              >
                View all listings
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Grid of Listings */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredServices.length > 0 ? (
                featuredServices.map((svc, idx) => (
                  <Link
                    key={svc.id}
                    href={`/services/${svc.id}`}
                    className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200 bg-[#fbfbfa] p-6 transition-all duration-300 hover:border-neutral-900 hover:bg-white hover:shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-4 border-b border-neutral-200/60">
                        <span className="text-xs font-mono font-bold text-neutral-400 group-hover:text-[#004ac6] transition-colors">
                          0{idx + 1}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-bold text-neutral-700">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>4.9</span>
                        </div>
                      </div>

                      <h3 className="mt-4 text-lg font-bold tracking-tight text-neutral-900 group-hover:text-[#004ac6] transition-colors line-clamp-2">
                        {svc.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-neutral-600 line-clamp-3">
                        {svc.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-neutral-200/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                          Starting at
                        </span>
                        <p className="text-base font-black tracking-tight text-neutral-950">
                          ₹{svc.price.toLocaleString()}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-bold text-neutral-900 group-hover:text-[#004ac6]">
                        View
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                /* Editorial Fallback Cards when database has no published items yet */
                [
                  {
                    num: '01',
                    title: 'Cinematic College Fest Video Edit',
                    desc: 'High-energy cut, sound design, and color grading in DaVinci Resolve with 48h turnaround.',
                    price: '₹1,499',
                    category: 'Video & Motion',
                  },
                  {
                    num: '02',
                    title: 'Full-Stack Next.js 14 Web App',
                    desc: 'Production-ready Next.js app with Tailwind, Supabase authentication, and database schemas.',
                    price: '₹4,999',
                    category: 'Web Dev',
                  },
                  {
                    num: '03',
                    title: 'DSA Mentorship & Placement Mock',
                    desc: '1-on-1 intensive session covering Trees, Graphs, DP patterns, and mock interviews.',
                    price: '₹799',
                    category: 'Tutoring',
                  },
                  {
                    num: '04',
                    title: 'Figma UI/UX Design System',
                    desc: 'Component tokens, auto-layout screens, and prototype ready for mobile or web apps.',
                    price: '₹2,499',
                    category: 'Design',
                  },
                ].map((item) => (
                  <Link
                    key={item.num}
                    href="/explore"
                    className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200 bg-[#fbfbfa] p-6 transition-all duration-300 hover:border-neutral-900 hover:bg-white hover:shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-4 border-b border-neutral-200/60">
                        <span className="text-xs font-mono font-bold text-neutral-400 group-hover:text-[#004ac6] transition-colors">
                          {item.num} // {item.category}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-bold text-neutral-700">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>4.9</span>
                        </div>
                      </div>

                      <h3 className="mt-4 text-lg font-bold tracking-tight text-neutral-900 group-hover:text-[#004ac6] transition-colors">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                        {item.desc}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-neutral-200/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                          Starting at
                        </span>
                        <p className="text-base font-black tracking-tight text-neutral-950">
                          {item.price}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-bold text-neutral-900 group-hover:text-[#004ac6]">
                        Explore
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        {/* The Campus Trust Triad Section */}
        <section className="w-full border-t border-neutral-200/80 bg-[#faf9f6] py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#004ac6]">
                <span>//</span> The Institutional Protocol
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-950 leading-[1.08]">
                Three pillars that eliminate campus transaction risk.
              </h2>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Lock,
                  step: '01',
                  title: 'Escrow Vault Protection',
                  desc: 'Funds are securely deposited into escrow when an order is created. The provider begins work knowing the payment is verified, while the client retains approval power.',
                },
                {
                  icon: GraduationCap,
                  step: '02',
                  title: 'Verified Student Credential',
                  desc: 'Every seller must authenticate with active institutional email addresses and university student IDs. Zero anonymous accounts or ghost freelancers.',
                },
                {
                  icon: ShieldCheck,
                  step: '03',
                  title: 'Proof-of-Work Reputation',
                  desc: 'Every completed order, verified rating, and client testimonial is bound to the student profile, building an undeniable portfolio for campus placements.',
                },
              ].map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.step}
                    className="relative flex flex-col justify-between rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 shadow-xs hover:border-neutral-900 transition-all duration-300"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-6 border-b border-neutral-100">
                        <span className="text-xs font-mono font-bold text-[#004ac6]">
                          {p.step} // PROTOCOL
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900">
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                      <h3 className="mt-6 text-2xl font-bold tracking-tight text-neutral-950">
                        {p.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                        {p.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final Editorial Call to Action */}
        <section className="relative overflow-hidden w-full border-t border-neutral-200/80 bg-neutral-950 py-24 sm:py-32 text-white">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 flex flex-col items-center text-center">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#004ac6]">
              JOIN THE CAMPUS SKILL EXCHANGE
            </span>
            <h2 className="mt-6 max-w-3xl text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
              Ready to build something exceptional with student talent?
            </h2>
            <p className="mt-6 max-w-xl text-base text-neutral-400 leading-relaxed">
              Find verified videographers, designers, developers, and academic coaches in seconds.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => router.push('/explore')}
                className="h-12 rounded-xl bg-[#004ac6] px-8 text-sm font-bold text-white hover:bg-[#003da8] shadow-md group"
              >
                Explore Skills Catalog
                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(session ? '/services/create' : '/register')}
                className="h-12 rounded-xl border border-neutral-700 bg-neutral-900 px-8 text-sm font-bold text-white hover:bg-neutral-800 hover:border-neutral-500"
              >
                Become a Student Provider
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="w-full border-t border-neutral-200/80 bg-[#faf9f6] py-12 px-6 sm:px-8 lg:px-12 text-xs text-neutral-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-neutral-900">SkillBridge</span>
            <span>•</span>
            <span>Built for students, by students.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/explore" className="hover:text-neutral-900 transition-colors">
              Explore
            </Link>
            <Link href="/login" className="hover:text-neutral-900 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-neutral-900 transition-colors">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
