'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Search,
  Sparkles,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/auth-context';

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
  const [query, setQuery] = useState('');

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
    <div className="flex min-h-screen w-full flex-col bg-[#fafafa]">
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-100">
        <nav className="mx-auto flex h-20 w-full max-w-screen-xl items-center justify-between px-6">
          <Link href="/" className="text-2xl font-bold text-[#004ac6]">
            SkillBridge
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/explore"
              className="text-sm font-semibold text-gray-600 hover:text-[#004ac6] hidden sm:block"
            >
              Explore Skills
            </Link>
            {session ? (
              <Button
                onClick={() => router.push('/dashboard')}
                className="h-auto rounded-lg bg-[#004ac6] px-4 py-2 text-sm font-bold text-white hover:bg-[#003b9e]"
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/login')}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Log in
                </Button>
                <Button
                  onClick={() => router.push('/register')}
                  className="h-auto rounded-lg bg-[#004ac6] px-4 py-2 text-sm font-bold text-white hover:bg-[#003b9e]"
                >
                  Get started
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero Section */}
        <section className="mx-auto flex w-full max-w-screen-xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f0f4ff] px-4 py-2 text-sm font-semibold text-[#004ac6] border border-blue-100">
            <Sparkles className="h-4 w-4 text-[#004ac6]" />
            AI-Powered Student Skill Marketplace
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-6xl">
            Find the right campus skill.{' '}
            <span className="text-[#004ac6]">Offer yours.</span>
          </h1>

          <p className="max-w-2xl text-base text-gray-600 sm:text-lg">
            SkillBridge connects college students to request and deliver verified services — from
            cinematic video editing to full-stack Next.js web development and placement prep tutoring.
          </p>

          {/* AI Search Bar on Hero */}
          <div className="w-full max-w-2xl mt-4">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center shadow-lg rounded-2xl">
              <Search className="absolute left-4 h-5 w-5 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe what you need (e.g. 'someone to edit a college fest video', 'Next.js developer')..."
                className="h-14 w-full rounded-2xl border-2 border-transparent bg-white pl-12 pr-36 text-sm text-gray-900 shadow-md transition-all focus:border-[#004ac6] focus:ring-0"
              />
              <Button
                type="submit"
                className="absolute right-2 h-10 gap-1.5 rounded-xl bg-[#004ac6] px-4 text-xs font-bold text-white hover:bg-[#003b9e] shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Find with AI
              </Button>
            </form>

            {/* Quick Suggestions Chips */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-semibold text-gray-400">Popular:</span>
              {QUICK_SEARCH_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition-colors hover:border-[#004ac6] hover:text-[#004ac6]"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Dual Action CTA Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row mt-4">
            <Button
              onClick={() => router.push(session ? '/explore' : '/register')}
              className="h-auto gap-2 rounded-xl bg-[#004ac6] px-8 py-3.5 text-sm font-bold text-white hover:bg-[#003b9e] shadow-md"
            >
              {session ? 'Explore All Services' : 'Get Started'}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/explore')}
              className="h-auto rounded-xl border-[#c3c6d7] px-8 py-3.5 text-sm font-bold text-gray-900 hover:bg-gray-50"
            >
              Browse Catalog
            </Button>
          </div>
        </section>

        {/* Features Row */}
        <section className="mx-auto grid w-full max-w-screen-xl grid-cols-1 gap-6 px-6 pb-20 sm:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: 'Natural-Language Search',
              desc: 'Describe what you need in plain words. Our NVIDIA Nemotron AI assistant understands intent, extracted skills, and categories.',
            },
            {
              icon: ShieldCheck,
              title: 'Escrow Protection',
              desc: 'Funds are securely locked in escrow until the student buyer reviews and accepts the completed deliverables.',
            },
            {
              icon: Users,
              title: 'Verified Campus Network',
              desc: 'Students authenticate with official institutional credentials and student ID verification for maximum trust.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-white p-6 shadow-sm hover:border-[#004ac6]/30 transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0f4ff] text-[#004ac6] mb-4">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">{f.title}</h3>
              <p className="text-xs leading-relaxed text-gray-600">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="flex w-full items-center justify-between border-t border-gray-100 bg-white px-6 py-6">
        <div className="flex flex-col items-start">
          <h2 className="pb-1 text-xl font-bold text-[#004ac6]">SkillBridge</h2>
          <p className="text-xs font-medium text-gray-500">
            © 2026 SkillBridge. Built for students, by students.
          </p>
        </div>
        <nav>
          <ul className="flex items-center gap-6">
            {['About', 'Terms', 'Privacy', 'Support'].map((link) => (
              <li key={link}>
                <span className="cursor-pointer text-xs font-medium text-gray-600 hover:text-[#004ac6]">
                  {link}
                </span>
              </li>
            ))}
          </ul>
        </nav>
      </footer>
    </div>
  );
}
