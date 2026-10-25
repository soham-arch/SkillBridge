'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { Sparkles, ShieldCheck, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { editorialEase } from './motion-tokens';

interface StoryStep {
  number: string;
  tagline: string;
  title: string;
  description: string;
  statsLabel?: string;
  statsValue?: string;
  icon: React.ElementType;
}

const STEPS: StoryStep[] = [
  {
    number: '01',
    tagline: 'INTENT-DRIVEN MATCHING',
    title: 'Natural-language AI search for real campus talent.',
    description:
      'Describe what you need in plain English—whether it is a 5-minute promo film edit, a full-stack Next.js project, or DSA interview coaching. Our model understands your exact requirements.',
    statsLabel: 'Average match latency',
    statsValue: '< 1.2s',
    icon: Sparkles,
  },
  {
    number: '02',
    tagline: 'CAMPUS ESCROW SYSTEM',
    title: 'Guaranteed safety with automated escrow protection.',
    description:
      'Funds are securely locked when you book. Sellers work with peace of mind knowing the budget is locked, while buyers only release payment upon approving the finished deliverable.',
    statsLabel: 'Protected transactions',
    statsValue: '100%',
    icon: ShieldCheck,
  },
  {
    number: '03',
    tagline: 'SEAMLESS EXECUTION',
    title: 'Collaborate with peers without friction.',
    description:
      'Integrated project workspace with live status updates, deliverable previews, and fast revisions. Built to match fast student schedules and rapid turnaround deadlines.',
    statsLabel: 'Median turnaround',
    statsValue: '48 Hours',
    icon: Zap,
  },
  {
    number: '04',
    tagline: 'CREDENTIAL & REPUTATION',
    title: 'Transform freelance work into verified college prestige.',
    description:
      'Every completed order adds verified reviews and showcases to the student provider profile, serving as proof-of-work for corporate placements and startup hiring.',
    statsLabel: 'Verified student rating',
    statsValue: '4.95 / 5',
    icon: CheckCircle2,
  },
];

export function StickyStorySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest: number) => {
    const totalSteps = STEPS.length;
    const stepIndex = Math.min(
      Math.floor(latest * totalSteps),
      totalSteps - 1
    );
    if (stepIndex >= 0 && stepIndex !== activeStep) {
      setActiveStep(stepIndex);
    }
  });

  return (
    <section
      ref={containerRef}
      className="relative w-full border-t border-neutral-200/80 bg-[#faf9f6]"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Sticky Story Heading & Progress Indicator */}
          <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-300/80 bg-neutral-100/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-700">
              <span className="h-1.5 w-1.5 rounded-full bg-[#004ac6]" />
              The SkillBridge Model
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-900 leading-[1.08]">
                Engineered for trust. <br />
                <span className="text-neutral-400 font-light">
                  Designed for craft.
                </span>
              </h2>
              <p className="text-base text-neutral-600 leading-relaxed max-w-md">
                A modern peer marketplace replacing chaotic college WhatsApp groups with verified credentials, transparent escrow, and instant discovery.
              </p>
            </div>

            {/* Interactive Progress List */}
            <div className="hidden lg:flex flex-col gap-3 pt-4 border-t border-neutral-200">
              {STEPS.map((step, idx) => {
                const isActive = activeStep === idx;
                return (
                  <button
                    key={step.number}
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    className={`group text-left py-3 px-4 rounded-xl transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-white border border-neutral-200 shadow-sm'
                        : 'hover:bg-neutral-100/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-mono font-bold ${
                          isActive ? 'text-[#004ac6]' : 'text-neutral-400'
                        }`}
                      >
                        {step.number}
                      </span>
                      <span
                        className={`text-sm font-semibold tracking-tight ${
                          isActive ? 'text-neutral-900' : 'text-neutral-600'
                        }`}
                      >
                        {step.tagline}
                      </span>
                    </div>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#004ac6]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Step Cards */}
          <div className="lg:col-span-7 space-y-8">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isCurrent = activeStep === idx;
              return (
                <div
                  key={step.number}
                  className={`relative rounded-3xl border bg-white p-8 sm:p-10 transition-all duration-500 ${
                    isCurrent
                      ? 'border-neutral-900 shadow-lg scale-[1.01]'
                      : 'border-neutral-200/90 shadow-sm opacity-85'
                  }`}
                >
                  <div className="flex items-center justify-between pb-6 border-b border-neutral-100">
                    <span className="text-xs font-mono font-bold tracking-widest text-[#004ac6] uppercase">
                      {step.number} // {step.tagline}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="pt-6 space-y-4">
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 leading-snug">
                      {step.title}
                    </h3>
                    <p className="text-base text-neutral-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {step.statsValue && (
                    <div className="mt-8 pt-6 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                        {step.statsLabel}
                      </span>
                      <span className="text-2xl font-black tracking-tight text-neutral-900">
                        {step.statsValue}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
