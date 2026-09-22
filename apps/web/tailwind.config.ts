import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        subtle: 'rgb(var(--subtle) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        'fg-invert': 'rgb(var(--fg-invert) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-invert': 'rgb(var(--muted-invert) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-invert': 'rgb(var(--border-invert) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        live: 'rgb(var(--live) / <alpha-value>)',
        'live-soft': 'rgb(var(--live-soft) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        'warn-soft': 'rgb(var(--warn-soft) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        'danger-soft': 'rgb(var(--danger-soft) / <alpha-value>)',
        stacks: 'rgb(var(--stacks) / <alpha-value>)',
        'stacks-ink': 'rgb(var(--stacks-ink) / <alpha-value>)',
        'stacks-soft': 'rgb(var(--stacks-soft) / <alpha-value>)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      /**
       * Two shadows only: a resting `soft` for every card, and a `lift` for
       * hover. Both are neutral-ink, low-opacity, no colour tint — real
       * elevation, not a coloured glow.
       */
      boxShadow: {
        soft: '0 1px 2px rgb(15 18 25 / 0.04), 0 1px 8px rgb(15 18 25 / 0.04)',
        lift: '0 8px 24px rgb(15 18 25 / 0.10), 0 2px 6px rgb(15 18 25 / 0.06)',
        none: 'none',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Inter',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
