'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

interface KineticBannerProps {
  words?: string[];
  className?: string;
  direction?: 'left' | 'right';
}

export function KineticBanner({
  words = ['DISCOVER', 'BUILD', 'COLLABORATE', 'GROW', 'DELIVER'],
  className = '',
  direction = 'left',
}: KineticBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const xTransform = useTransform(
    scrollYProgress,
    [0, 1],
    direction === 'left' ? ['0%', '-25%'] : ['-25%', '0%']
  );

  const repeated = [...words, ...words, ...words];

  if (shouldReduceMotion) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden py-8 border-y border-neutral-200/60 bg-neutral-100/40 select-none ${className}`}
      >
        <div className="flex items-center gap-8 whitespace-nowrap text-3xl font-extrabold uppercase tracking-tight text-neutral-900/80">
          {words.map((word, idx) => (
            <React.Fragment key={idx}>
              <span>{word}</span>
              <span className="text-neutral-300">•</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden py-10 border-y border-neutral-200/80 bg-neutral-50/60 select-none ${className}`}
      aria-hidden="true"
    >
      <motion.div
        style={{ x: xTransform }}
        className="flex items-center gap-10 whitespace-nowrap"
      >
        {repeated.map((word, idx) => {
          const isOutlined = idx % 2 === 1;
          return (
            <div key={idx} className="flex items-center gap-10">
              <span
                className={`text-5xl md:text-7xl font-black uppercase tracking-tighter transition-colors ${
                  isOutlined
                    ? 'text-transparent [-webkit-text-stroke:1px_#a3a3a3]'
                    : 'text-neutral-900'
                }`}
              >
                {word}
              </span>
              <span className="text-xl md:text-2xl font-light text-neutral-300">
                /
              </span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
