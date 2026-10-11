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
  LogOut,
  User as UserIcon,
  ShieldAlert,
  PlusCircle,
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
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    session,
    user,
    profile,
    isStudentVerified,
    isAdmin,
    isBuyer,
    isSeller,
    canSell,
    activeRole,
    switchRole,
    signOut,
    loading,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || 'SB';

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/95 backdrop-blur-md">
      <nav className="mx-auto flex h-20 w-full max-w-screen-xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link
            href={session ? '/dashboard' : '/'}
            className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#004ac6]"
          >
            SkillBridge
            <span className="rounded-full bg-[#f0f4ff] px-2 py-0.5 text-[10px] font-bold text-[#004ac6] border border-[#004ac6]/20">
              Campus
            </span>
          </Link>

          {/* Navigation Links for Authenticated Users */}
          {session && (
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

              {isAdmin && (
                <Link
                  href="/admin"
                  className={cn(
                    'text-sm font-semibold transition-colors hover:text-red-700 flex items-center gap-1.5',
                    pathname.startsWith('/admin') ? 'text-red-700 font-bold' : 'text-gray-600'
                  )}
                >
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  Admin Console
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {session && user ? (
            <>
              {/* Role Switcher Pill (if seller or both) */}
              {isSeller ? (
                <div className="hidden sm:flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold border border-gray-200">
                  <button
                    type="button"
                    onClick={() => switchRole('buyer')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                      activeRole === 'buyer'
                        ? 'bg-white text-[#004ac6] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Buying
                  </button>
                  <button
                    type="button"
                    onClick={() => switchRole('seller')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                      activeRole === 'seller'
                        ? 'bg-white text-[#004ac6] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    Selling
                  </button>
                </div>
              ) : (
                <Link href="/onboarding" className="hidden sm:inline-block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold rounded-xl border-dashed border-[#004ac6] text-[#004ac6] hover:bg-[#f0f4ff]"
                  >
                    <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                    Become a Seller
                  </Button>
                </Link>
              )}

              {/* Notifications Dropdown */}
              <NotificationsDropdown userId={user.id} />

              {/* Offer skill or Browse button */}
              {activeRole === 'seller' ? (
                <Button
                  onClick={() => router.push('/services/create')}
                  className="h-10 rounded-xl bg-[#004ac6] px-4 text-xs font-bold text-white hover:bg-[#003b9e] shadow-sm hidden sm:inline-flex"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                  Offer Skill
                </Button>
              ) : (
                <Button
                  onClick={() => router.push('/explore')}
                  variant="outline"
                  className="h-10 rounded-xl border-gray-200 px-4 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm hidden sm:inline-flex"
                >
                  <Compass className="h-3.5 w-3.5 mr-1.5" />
                  Explore Services
                </Button>
              )}

              {/* User Avatar Menu Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004ac6]"
                >
                  <Avatar className="h-10 w-10 border border-[#c3c6d7]">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback className="text-xs font-bold text-[#004ac6]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden sm:block" />
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-border bg-white shadow-2xl p-3 animate-in fade-in space-y-2">
                      {/* User Header */}
                      <div className="px-2 py-1.5 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {profile?.full_name || 'Student Account'}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {isStudentVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="h-3 w-3" />
                              Verified Student
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                              Verification Pending
                            </span>
                          )}
                          {isAdmin && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Links */}
                      <div className="space-y-1">
                        <Link
                          href="/profile"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-[#f0f4ff] hover:text-[#004ac6] transition-colors"
                        >
                          <UserIcon className="h-4 w-4" />
                          My Profile
                        </Link>
                        <Link
                          href="/dashboard"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-[#f0f4ff] hover:text-[#004ac6] transition-colors"
                        >
                          <Compass className="h-4 w-4" />
                          Dashboard
                        </Link>
                        <Link
                          href="/orders"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-[#f0f4ff] hover:text-[#004ac6] transition-colors"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          Orders & Escrow
                        </Link>
                        <Link
                          href="/my-services"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-[#f0f4ff] hover:text-[#004ac6] transition-colors"
                        >
                          <Briefcase className="h-4 w-4" />
                          My Services
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
                          >
                            <ShieldAlert className="h-4 w-4 text-red-600" />
                            Admin Console
                          </Link>
                        )}
                      </div>

                      {/* Sign Out */}
                      <div className="border-t border-gray-100 pt-1">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-xs font-bold text-gray-700 hover:text-gray-900">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="h-10 rounded-xl bg-[#004ac6] px-4 text-xs font-bold text-white hover:bg-[#003b9e] shadow-sm">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
