'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Code, Video, BookOpen, Camera, Cpu } from 'lucide-react';

interface ShowcaseItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  tags: string[];
  queryParam: string;
  icon: React.ElementType;
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: '01',
    category: 'SOFTWARE & AI',
    title: 'Full-Stack Apps & AI Tooling',
    subtitle: 'Next.js 14, Supabase, Python APIs, and custom LLM embeddings built by computer science students.',
    tags: ['React', 'Next.js', 'Python', 'Tailwind'],
    queryParam: 'Next.js developer',
    icon: Code,
  },
  {
    id: '02',
    category: 'MOTION & MEDIA',
    title: 'Cinematic Video & Editing',
    subtitle: 'Premiere Pro, After Effects, DaVinci Resolve color grading for college fests, reels, and YouTube.',
    tags: ['DaVinci', 'After Effects', 'Sound Design'],
    queryParam: 'video editing',
    icon: Video,
  },
  {
    id: '03',
    category: 'PLACEMENT & TECH PREP',
    title: 'DSA Mentorship & Code Review',
    subtitle: '1-on-1 tutoring on Dynamic Programming, Graphs, and System Design with students placed at tier-1 firms.',
    tags: ['DSA', 'LeetCode', 'System Design'],
    queryParam: 'DSA placement tutor',
    icon: BookOpen,
  },
  {
    id: '04',
    category: 'DESIGN & PROTOTYPING',
    title: 'Figma UI/UX & Brand Systems',
    subtitle: 'Design tokens, high-fidelity prototypes, and design systems crafted for hackathons and startups.',
    tags: ['Figma', 'UI/UX', 'Design Systems'],
    queryParam: 'Figma UI/UX prototype',
    icon: Camera,
  },
  {
    id: '05',
    category: 'ENGINEERING & HARDWARE',
    title: 'Embedded Systems & CAD',
    subtitle: 'SolidWorks 3D modelling, Arduino/ESP32 firmware, and PCB validation by engineering leads.',
    tags: ['CAD', 'SolidWorks', 'IoT', 'Robotics'],
    queryParam: 'embedded systems',
    icon: Cpu,
  },
];

export function HorizontalShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Desktop horizontal translation: translate from 0 to -40% as user scrolls
  const xTransform = useTransform(scrollYProgress, [0.1, 0.85], ['5%', '-45%']);

  return (
    <section
      ref={containerRef}
      className="relative w-full border-t border-neutral-200/80 bg-white py-24 sm:py-32 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#004ac6]">
            <span>//</span> Curated Campus Disciplines
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-900">
            Work that commands attention.
          </h2>
        </div>
        <p className="text-sm sm:text-base text-neutral-500 max-w-md">
          Explore specialized services delivered by verified students across leading colleges.
        </p>
      </div>

      {/* Desktop Horizontal Track (with scroll-linked transform) */}
      <div className="hidden lg:block w-full">
        <motion.div
          style={{ x: shouldReduceMotion ? '0%' : xTransform }}
          className="flex gap-8 pl-12 pr-24 w-max cursor-grab active:cursor-grabbing"
        >
          {SHOWCASE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={`/explore?q=${encodeURIComponent(item.queryParam)}`}
                className="group relative flex flex-col justify-between w-[440px] h-[340px] rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-8 transition-all duration-300 hover:border-neutral-900 hover:bg-white hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between pb-6 border-b border-neutral-200/80">
                    <span className="text-xs font-mono font-bold tracking-wider text-neutral-400 group-hover:text-[#004ac6] transition-colors">
                      {item.id} / {item.category}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-neutral-200 text-neutral-900 group-hover:bg-[#004ac6] group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <h3 className="mt-6 text-2xl font-bold tracking-tight text-neutral-900 group-hover:text-[#004ac6] transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600 line-clamp-3">
                    {item.subtitle}
                  </p>
                </div>

                <div className="pt-6 border-t border-neutral-200/60 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-neutral-900 group-hover:text-[#004ac6] transition-colors">
                    Explore
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </motion.div>
      </div>

      {/* Mobile/Tablet Adaptive Grid */}
      <div className="lg:hidden mx-auto max-w-7xl px-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {SHOWCASE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={`/explore?q=${encodeURIComponent(item.queryParam)}`}
              className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-[#fbfbfa] p-6 shadow-sm hover:border-neutral-900 transition-all"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                  <span className="text-[11px] font-mono font-bold tracking-wider text-neutral-400">
                    {item.id} / {item.category}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-neutral-200 text-neutral-900">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="mt-4 text-xl font-bold tracking-tight text-neutral-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                  {item.subtitle}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#004ac6]">
                  Browse Listings →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
