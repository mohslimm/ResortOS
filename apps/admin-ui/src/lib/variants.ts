export const ANIMATION_DURATION = {
  fast: 0.15,
  base: 0.3,
  slow: 0.6,
  cinematic: 1.2,
};

export const EASE = {
  smooth: [0.22, 1, 0.36, 1] as const,
  snap: [0.34, 1.56, 0.64, 1] as const,
};

export const VARIANTS = {
  staggerContainer: {
    animate: {
      transition: { staggerChildren: 0.08 },
    },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: ANIMATION_DURATION.base, ease: EASE.smooth },
    },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { duration: ANIMATION_DURATION.base, ease: EASE.smooth },
    },
  },
};
