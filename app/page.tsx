'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, Sparkles, Users, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';

export default function LandingPage() {
  const router = useRouter();
  const { session } = useAuth();

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#fafafa]">
      <header className="w-full bg-white">
        <nav className="mx-auto flex h-20 w-full max-w-screen-xl items-center justify-between px-6">
          <span className="text-2xl font-bold text-[#004ac6]">SkillBridge</span>
          <div className="flex items-center gap-4">
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
          </div>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-screen-xl flex-col items-center gap-8 px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f3f3fe] px-4 py-2 text-sm font-medium text-[#004ac6]">
            <Sparkles className="h-4 w-4" />
            Built for students, by students
          </div>
          <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-gray-900 sm:text-6xl">
            Find the right skill.{' '}
            <span className="text-[#004ac6]">Offer yours.</span>
          </h1>
          <p className="max-w-2xl text-lg text-gray-600">
            SkillBridge connects students to discover, request, and offer services — from tutoring
            to design to development. Build your portfolio, earn, and learn.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              onClick={() => router.push(session ? '/explore' : '/register')}
              className="h-auto gap-2 rounded-lg bg-[#004ac6] px-8 py-3 text-sm font-bold text-white hover:bg-[#003b9e]"
            >
              {session ? 'Explore services' : 'Get started'}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/explore')}
              className="h-auto rounded-lg border-[#c3c6d7] px-8 py-3 text-sm font-bold text-gray-900 hover:bg-gray-50"
            >
              Browse services
            </Button>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-screen-xl grid-cols-1 gap-6 px-6 pb-20 sm:grid-cols-3">
          {[
            { icon: Search, title: 'Discover', desc: 'Search and filter services offered by students near you.' },
            { icon: Users, title: 'Connect', desc: 'Request services, message providers, and collaborate.' },
            { icon: ShieldCheck, title: 'Trusted', desc: 'Reviews and ratings keep the community accountable.' },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-white p-6 shadow-sm"
            >
              <f.icon className="mb-4 h-8 w-8 text-[#004ac6]" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="flex w-full items-center justify-between bg-[#f3f3fe] px-6 py-6">
        <div className="flex flex-col items-start">
          <h2 className="pb-2 text-2xl font-bold text-[#004ac6]">SkillBridge</h2>
          <p className="text-xs font-medium tracking-[0.12px] text-gray-600">
            © 2024 SkillBridge. Built for students, by students.
          </p>
        </div>
        <nav>
          <ul className="flex items-center gap-6">
            {['About', 'Terms', 'Privacy', 'Support'].map((link) => (
              <li key={link}>
                <span className="cursor-pointer text-xs font-medium tracking-[0.12px] text-gray-600 hover:text-[#004ac6]">
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
