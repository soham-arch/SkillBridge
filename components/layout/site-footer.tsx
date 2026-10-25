import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-neutral-200/80 bg-[#fbfbfa] text-neutral-900">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16 pb-16 border-b border-neutral-200/70">
          {/* Brand Manifesto */}
          <div className="md:col-span-5 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-2xl font-black tracking-tight text-neutral-950"
            >
              <span className="h-3 w-3 rounded-full bg-[#004ac6]" />
              SkillBridge
            </Link>
            <p className="text-sm leading-relaxed text-neutral-600 max-w-sm">
              The premier campus skill marketplace connecting ambitious students for digital design, engineering, media production, and academic prep.
            </p>
            <div className="pt-2 text-xs font-mono font-medium text-neutral-400">
              MIT-WPU CAMPUS BETA // VERIFIED STUDENT NETWORK
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div className="space-y-3">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                Marketplace
              </p>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link
                    href="/explore"
                    className="text-neutral-600 hover:text-[#004ac6] transition-colors"
                  >
                    Browse Catalog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/explore?q=Next.js"
                    className="text-neutral-600 hover:text-[#004ac6] transition-colors"
                  >
                    Web Development
                  </Link>
                </li>
                <li>
                  <Link
                    href="/explore?q=video+editing"
                    className="text-neutral-600 hover:text-[#004ac6] transition-colors"
                  >
                    Video & Motion
                  </Link>
                </li>
                <li>
                  <Link
                    href="/explore?q=DSA"
                    className="text-neutral-600 hover:text-[#004ac6] transition-colors"
                  >
                    DSA Tutoring
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                Governance
              </p>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link
                    href="/orders"
                    className="text-neutral-600 hover:text-[#004ac6] transition-colors"
                  >
                    Escrow Protection
                  </Link>
                </li>
                <li>
                  <Link
                    href="/onboarding"
                    className="text-neutral-600 hover:text-[#004ac6] transition-colors"
                  >
                    Student Verification
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services/create"
                    className="text-neutral-600 hover:text-[#004ac6] transition-colors"
                  >
                    Become a Provider
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                Integrations
              </p>
              <ul className="space-y-2.5 text-sm text-neutral-600">
                <li>Supabase Auth</li>
                <li>Nemotron AI</li>
                <li>Escrow Vault</li>
                <li>Student ID Check</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} SkillBridge Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-neutral-900 cursor-pointer transition-colors">
              Terms of Service
            </span>
            <span className="hover:text-neutral-900 cursor-pointer transition-colors">
              Privacy Protocol
            </span>
            <span className="hover:text-neutral-900 cursor-pointer transition-colors">
              Campus Guidelines
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
