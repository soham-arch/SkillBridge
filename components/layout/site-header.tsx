'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Briefcase,
  Compass,
  Calendar,
  ShieldCheck,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';
import { NotificationsDropdown } from '@/components/layout/notifications-dropdown';

const navItems = [
  { label: 'Explore', href: '/explore', icon: Compass },
  { label: 'Orders & Escrow', href: '/orders', icon: ShoppingBag },
  { label: 'My Bookings', href: '/bookings', icon: Calendar },
  { label: 'My Services', href: '/my-services', icon: Briefcase },
  { label: 'Admin', href: '/admin', icon: ShieldCheck },
];

const DEMO_PERSONAS = [
  { id: '10000000-0000-0000-0000-000000000001', name: 'Alex Sharma', role: 'Seller (Full Stack Dev)', email: 'alex.tech@example.com' },
  { id: '10000000-0000-0000-0000-000000000002', name: 'Priya Verma', role: 'Seller (UI/UX Designer)', email: 'priya.design@example.com' },
  { id: '10000000-0000-0000-0000-000000000003', name: 'Rohan Kulkarni', role: 'Buyer (DSA Student)', email: 'rohan.student@example.com' },
  { id: '10000000-0000-0000-0000-000000000004', name: 'Sneha Patil', role: 'Seller (Video Editor)', email: 'sneha.video@example.com' },
  { id: 'admin-user-0000-0000-000000000001', name: 'Admin Console', role: 'Administrator', email: 'admin@skillbridge.edu' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, profile, loading } = useAuth();
  const [personaOpen, setPersonaOpen] = useState(false);

  // Active user ID (defaulting to Alex Sharma for preview)
  const currentUserId = session?.user?.id ?? '10000000-0000-0000-0000-000000000001';

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AS';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/95 backdrop-blur-md">
      <nav className="mx-auto flex h-20 w-full max-w-screen-xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#004ac6]"
          >
            SkillBridge
            <span className="rounded-full bg-[#f0f4ff] px-2 py-0.5 text-[10px] font-bold text-[#004ac6] border border-[#004ac6]/20">
              V2
            </span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-sm font-semibold transition-colors hover:text-[#004ac6] flex items-center gap-1.5',
                    active ? 'text-[#004ac6]' : 'text-gray-600'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          <NotificationsDropdown userId={currentUserId} />

          {/* Quick Persona Switcher for Evaluation */}
          <div className="relative">
            <button
              onClick={() => setPersonaOpen(!personaOpen)}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <UserCheck className="h-3.5 w-3.5 text-[#004ac6]" />
              <span>{profile?.full_name ?? 'Alex Sharma'}</span>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>

            {personaOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPersonaOpen(false)} />
                <div className="absolute right-0 mt-2 z-50 w-72 rounded-2xl border border-border bg-white shadow-2xl p-3 animate-in fade-in">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block px-2 pb-2">
                    Switch Test Persona
                  </span>
                  <div className="space-y-1">
                    {DEMO_PERSONAS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setPersonaOpen(false);
                          if (p.role === 'Administrator') {
                            router.push('/admin');
                          } else {
                            router.push('/dashboard');
                          }
                        }}
                        className="w-full text-left rounded-xl p-2 hover:bg-[#f0f4ff] transition-colors"
                      >
                        <p className="text-xs font-bold text-gray-900">{p.name}</p>
                        <p className="text-[11px] text-gray-500">{p.role}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <Button
            onClick={() => router.push('/services/create')}
            className="h-10 rounded-xl bg-[#004ac6] px-4 text-xs font-bold text-white hover:bg-[#003b9e] shadow-sm"
          >
            Offer Skill
          </Button>

          <Link
            href="/profile"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004ac6]"
          >
            <Avatar className="h-10 w-10 border border-[#c3c6d7]">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="text-xs font-bold text-[#004ac6]">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </nav>
    </header>
  );
}
