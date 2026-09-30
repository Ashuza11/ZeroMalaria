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
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

/** Step card transition: opacity + y only (never animate filter with springs). */
export const stepCardTransition: Transition = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1],
};

export function motionSafe(reduced: boolean | null, variants: Variants): Variants | undefined {
  return reduced ? undefined : variants;
}

/* ---------- iOS-style springs ---------- */
export const spring: Transition = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 };
export const softSpring: Transition = { type: 'spring', stiffness: 170, damping: 26, mass: 1 };
export const bouncy: Transition = { type: 'spring', stiffness: 520, damping: 22, mass: 0.7 };
export const iosEase = [0.32, 0.72, 0, 1] as const;

/** Blur-in reveal: tween only, blur always >= 0 (springs overshoot and break filter). */
export const blurUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: iosEase } },
};

/** Safe tween for any remaining filter blur animations. */
export const blurTween: Transition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] };
