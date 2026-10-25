export const editorialEase = [0.16, 1, 0.3, 1] as const;
export const smoothEase = [0.25, 0.1, 0.25, 1.0] as const;

export const motionTokens = {
  duration: {
    fast: 0.2,
    normal: 0.45,
    slow: 0.8,
    cinematic: 1.1,
  },
  ease: editorialEase,
  stagger: 0.08,
};

export const fadeInUpVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.slow,
      ease: editorialEase,
    },
  },
};

export const staggerContainerVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: motionTokens.stagger,
      delayChildren: 0.1,
    },
  },
};

export const cardHoverTransition = {
  duration: 0.28,
  ease: editorialEase,
};
