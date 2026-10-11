'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Check, ShieldAlert, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseProjectDetails } from '@/lib/auth/oauth';

interface GoogleOAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseEmailFallback?: () => void;
}

export function GoogleOAuthModal({
  open,
  onOpenChange,
  onUseEmailFallback,
}: GoogleOAuthModalProps) {
  const [copied, setCopied] = useState(false);
  const { projectRef, dashboardUrl, callbackUrl } = getSupabaseProjectDetails();

  function handleCopyCallback() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      toast.success('Redirect URI copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function handleEmailFallback() {
    onOpenChange(false);
    if (onUseEmailFallback) {
      onUseEmailFallback();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 sm:rounded-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Google OAuth Setup Required
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Google provider is not yet enabled in your Supabase project.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-4 text-xs text-gray-600">
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 space-y-2">
            <p className="font-semibold text-amber-900">
              Why did this happen?
            </p>
            <p className="text-amber-800 leading-relaxed">
              Supabase returned <code className="rounded bg-amber-200/60 px-1 py-0.5 font-mono text-[11px] text-amber-900">Unsupported provider</code> because Google Sign-In requires your Google OAuth credentials in your Supabase Cloud settings.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
              How to enable Google Sign-In (1 minute):
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed text-gray-600">
              <li>
                Open the{' '}
                <a
                  href={dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                >
                  Supabase Auth Providers Dashboard <ExternalLink className="h-3 w-3 inline" />
                </a>.
              </li>
              <li>
                Locate <span className="font-semibold text-gray-800">Google</span> and toggle it to <span className="font-semibold text-emerald-700">Enabled</span>.
              </li>
              <li>
                Enter your Google Cloud <span className="font-semibold text-gray-800">Client ID</span> & <span className="font-semibold text-gray-800">Client Secret</span>.
              </li>
              <li>
                In Google Cloud Console, add this Authorized redirect URI:
              </li>
            </ol>

            <div className="mt-1 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[11px] text-gray-700">
              <span className="truncate pr-2">{callbackUrl}</span>
              <button
                type="button"
                onClick={handleCopyCallback}
                className="flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-100"
                title="Copy Redirect URI"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            <Button
              type="button"
              onClick={handleEmailFallback}
              className="w-full gap-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Mail className="h-4 w-4" />
              Use Student Email & Password Instead
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              className="w-full gap-1.5 rounded-xl border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
            >
              <a href={dashboardUrl} target="_blank" rel="noopener noreferrer">
                Configure in Supabase Dashboard
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
