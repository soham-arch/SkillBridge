'use client';

import { ShieldCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  college?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function VerifiedBadge({
  college,
  size = 'md',
  showLabel = true,
  className = '',
}: VerifiedBadgeProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <span
      title={college ? `Verified Student of ${college}` : 'Verified College Student'}
      className={`inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-full px-2 py-0.5 ${textSize} ${className}`}
    >
      <ShieldCheck className={`${iconSize} text-emerald-600 shrink-0`} />
      {showLabel && <span>Verified Student</span>}
    </span>
  );
}
