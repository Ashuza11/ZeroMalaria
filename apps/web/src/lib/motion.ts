import type { Transition, Variants } from 'framer-motion';

export const easeOut: Transition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export const listContainer: Variants = {
  animate: { transition: { staggerChildren: 0.04 } },
};

export const listItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export const scalePress = { scale: 0.98 };

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export function motionSafe(reduced: boolean | null, variants: Variants): Variants | undefined {
  return reduced ? undefined : variants;
}

/* ---------- iOS-style springs ---------- */
export const spring: Transition = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 };
export const softSpring: Transition = { type: 'spring', stiffness: 170, damping: 26, mass: 1 };
export const bouncy: Transition = { type: 'spring', stiffness: 520, damping: 22, mass: 0.7 };
export const iosEase = [0.32, 0.72, 0, 1] as const;

/** Blur-in reveal used for content entering the viewport. */
export const blurUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(10px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: iosEase } },
};
