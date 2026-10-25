'use client';

import { useState, useEffect } from 'react';
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
  Menu,
  X,
  Sparkles,
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
    activeRole,
    switchRole,
    signOut,
  } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 20);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    setMobileNavOpen(false);
    await signOut();
    router.push('/login');
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-neutral-200/80 shadow-xs'
          : 'bg-[#faf9f6]/95 backdrop-blur-sm border-b border-neutral-200/50'
      }`}
    >
      <nav
        className={`mx-auto flex w-full max-w-7xl items-center justify-between px-6 sm:px-8 transition-all duration-300 ${
          isScrolled ? 'h-16' : 'h-20'
        }`}
      >
        {/* Brand Logo & Editorial Wordmark */}
        <div className="flex items-center gap-8 lg:gap-10">
          <Link
            href={session ? '/dashboard' : '/'}
            className="group flex items-center gap-2.5 text-xl sm:text-2xl font-black tracking-tight text-neutral-950 transition-opacity hover:opacity-85"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#004ac6] transition-transform duration-300 group-hover:scale-125" />
            <span>SkillBridge</span>
            <span className="hidden sm:inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 border border-neutral-200 rounded-md px-1.5 py-0.5">
              Campus
            </span>
          </Link>

          {/* Navigation Items (Authenticated) */}
          {session && (
            <div className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'text-xs font-semibold tracking-tight uppercase tracking-wider transition-colors py-1 relative',
                      active
                        ? 'text-neutral-950 font-bold'
                        : 'text-neutral-500 hover:text-neutral-900'
                    )}
                  >
                    {item.label}
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#004ac6] rounded-full" />
                    )}
                  </Link>
                );
              })}

              {isAdmin && (
                <Link
                  href="/admin"
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5',
                    pathname.startsWith('/admin')
                      ? 'text-red-700 font-bold'
                      : 'text-neutral-500 hover:text-red-600'
                  )}
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                  Admin
                </Link>
              )}
            </div>
          )}

          {/* Unauthenticated Quick Links */}
          {!session && (
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/explore"
                className="text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-neutral-950 transition-colors"
              >
                Explore Skills
              </Link>
            </div>
          )}
        </div>

        {/* Right Section: Role switch, CTA, notifications, profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {session && user ? (
            <>
              {/* Role Toggle Pill */}
              {isSeller ? (
                <div className="hidden sm:flex items-center bg-neutral-100/90 p-1 rounded-xl text-xs font-semibold border border-neutral-200/80">
                  <button
                    type="button"
                    onClick={() => switchRole('buyer')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                      activeRole === 'buyer'
                        ? 'bg-white text-neutral-950 shadow-xs font-bold'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Buying
                  </button>
                  <button
                    type="button"
                    onClick={() => switchRole('seller')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                      activeRole === 'seller'
                        ? 'bg-white text-neutral-950 shadow-xs font-bold'
                        : 'text-neutral-500 hover:text-neutral-900'
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
                    className="text-xs font-bold rounded-xl border border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                  >
                    <Briefcase className="h-3.5 w-3.5 mr-1.5 text-[#004ac6]" />
                    Become a Seller
                  </Button>
                </Link>
              )}

              {/* Action Button (Offer Skill / Explore) */}
              {activeRole === 'seller' ? (
                <Button
                  onClick={() => router.push('/services/create')}
                  size="sm"
                  className="rounded-xl bg-neutral-950 px-4 text-xs font-bold text-white hover:bg-black hidden sm:inline-flex"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                  Offer Skill
                </Button>
              ) : (
                <Button
                  onClick={() => router.push('/explore')}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-neutral-300 px-4 text-xs font-bold text-neutral-800 hover:bg-neutral-100 hidden sm:inline-flex"
                >
                  <Compass className="h-3.5 w-3.5 mr-1.5 text-[#004ac6]" />
                  Explore Catalog
                </Button>
              )}

              {/* Notifications */}
              <NotificationsDropdown userId={user.id} />

              {/* User Avatar Menu Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004ac6]"
                  aria-label="User menu"
                >
                  <Avatar className="h-9 w-9 border border-neutral-300 shadow-2xs">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback className="text-xs font-black text-neutral-900 bg-neutral-100">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-neutral-400 hidden sm:block" />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-neutral-200 bg-white shadow-xl p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                      {/* User Header */}
                      <div className="px-2 py-2 border-b border-neutral-100">
                        <p className="text-xs font-bold text-neutral-900 truncate">
                          {profile?.full_name || 'Student Account'}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {user.email}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
                          {isStudentVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              Verified Student
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
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
                          href="/dashboard"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 transition-colors"
                        >
                          <Compass className="h-3.5 w-3.5 text-[#004ac6]" />
                          Dashboard
                        </Link>
                        <Link
                          href="/profile"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 transition-colors"
                        >
                          <UserIcon className="h-3.5 w-3.5 text-neutral-500" />
                          My Profile
                        </Link>
                        <Link
                          href="/orders"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 transition-colors"
                        >
                          <ShoppingBag className="h-3.5 w-3.5 text-neutral-500" />
                          Orders & Escrow
                        </Link>
                        <Link
                          href="/my-services"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 transition-colors"
                        >
                          <Briefcase className="h-3.5 w-3.5 text-neutral-500" />
                          My Services
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
                          >
                            <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                            Admin Console
                          </Link>
                        )}
                      </div>

                      {/* Sign Out */}
                      <div className="border-t border-neutral-100 pt-1">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-bold text-neutral-700 hover:text-neutral-950"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="rounded-xl bg-[#004ac6] px-4 text-xs font-bold text-white hover:bg-[#003da8] shadow-xs"
                >
                  Join Campus
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden p-2 rounded-xl text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none"
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Navigation */}
      {mobileNavOpen && (
        <div className="md:hidden border-b border-neutral-200 bg-white px-6 py-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-3">
            <Link
              href="/explore"
              onClick={() => setMobileNavOpen(false)}
              className="text-sm font-semibold text-neutral-800 hover:text-[#004ac6]"
            >
              Explore Skills
            </Link>
            {session && (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileNavOpen(false)}
                  className="text-sm font-semibold text-neutral-800 hover:text-[#004ac6]"
                >
                  Dashboard
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setMobileNavOpen(false)}
                  className="text-sm font-semibold text-neutral-800 hover:text-[#004ac6]"
                >
                  Orders & Escrow
                </Link>
                <Link
                  href="/my-services"
                  onClick={() => setMobileNavOpen(false)}
                  className="text-sm font-semibold text-neutral-800 hover:text-[#004ac6]"
                >
                  My Services
                </Link>
                <Link
                  href="/bookings"
                  onClick={() => setMobileNavOpen(false)}
                  className="text-sm font-semibold text-neutral-800 hover:text-[#004ac6]"
                >
                  My Bookings
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileNavOpen(false)}
                    className="text-sm font-bold text-red-600"
                  >
                    Admin Console
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
