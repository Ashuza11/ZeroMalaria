/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
          soft: 'var(--color-primary-soft)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          soft: 'var(--color-accent-soft)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          soft: 'var(--color-success-soft)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          soft: 'var(--color-warning-soft)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          soft: 'var(--color-danger-soft)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          soft: 'var(--color-info-soft)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)',
        },
        app: 'var(--color-app)',
        border: 'var(--color-border)',
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted: 'var(--color-ink-muted)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['20px', { lineHeight: '28px' }],
        xl: ['24px', { lineHeight: '32px' }],
        '2xl': ['32px', { lineHeight: '40px' }],
        '3xl': ['40px', { lineHeight: '48px' }],
      },
      borderRadius: {
        card: '12px',
        control: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)',
        lift: '0 2px 4px rgba(15,23,42,0.06), 0 12px 28px rgba(15,23,42,0.10)',
      },
      spacing: {
        18: '4.5rem',
      },
      maxWidth: {
        chw: '480px',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(220,38,38,0.35)' },
          '70%': { boxShadow: '0 0 0 12px rgba(220,38,38,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(220,38,38,0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        modalIn: {
          from: { transform: 'scale(0.98) translateY(8px)' },
          to: { transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s infinite',
        'pulse-ring': 'pulseRing 1.6s ease-out infinite',
        fadeIn: 'fadeIn 150ms ease-out forwards',
        modalIn: 'modalIn 150ms ease-out forwards',
      },
    },
  },
  plugins: [],
};
