/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: {
            deep: 'rgb(var(--brand-green-deep) / <alpha-value>)',
            DEFAULT: 'rgb(var(--brand-green) / <alpha-value>)',
            fresh: 'rgb(var(--brand-green-fresh) / <alpha-value>)',
            mist: 'rgb(var(--brand-green-mist) / <alpha-value>)',
          },
          yellow: {
            DEFAULT: 'rgb(var(--brand-yellow) / <alpha-value>)',
            soft: 'rgb(var(--brand-yellow-soft) / <alpha-value>)',
          },
          red: {
            DEFAULT: 'rgb(var(--brand-red) / <alpha-value>)',
            soft: 'rgb(var(--brand-red-soft) / <alpha-value>)',
          },
          white: 'rgb(var(--brand-surface) / <alpha-value>)',
          ink: 'rgb(var(--brand-ink) / <alpha-value>)',
        },
        // Semantic layer: use these in new code.
        page: 'rgb(var(--app-bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          strong: 'rgb(var(--line-strong) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--brand-ink) / <alpha-value>)',
          2: 'rgb(var(--text-2) / <alpha-value>)',
          3: 'rgb(var(--text-3) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--brand-green-fresh) / <alpha-value>)',
          soft: 'rgb(var(--brand-green-mist) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          soft: 'rgb(var(--brand-yellow-soft) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--brand-red) / <alpha-value>)',
          soft: 'rgb(var(--brand-red-soft) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          soft: 'rgb(var(--info-soft) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        h1: ['1.75rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        h2: ['1.375rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        h3: ['1.125rem', { lineHeight: '1.3' }],
        body: ['0.9375rem', { lineHeight: '1.5' }],
        small: ['0.8125rem', { lineHeight: '1.45' }],
        caption: ['0.75rem', { lineHeight: '1.4' }],
        label: ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.08em' }],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '14px',
        '2xl': '16px',
        '3xl': '20px',
        // Legacy names kept so old call sites land on the new scale.
        xl2: '16px',
        xl3: '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow-ink) / 0.04), 0 1px 3px rgb(var(--shadow-ink) / 0.05)',
        raised: '0 4px 14px -4px rgb(var(--shadow-ink) / 0.12), 0 1px 3px rgb(var(--shadow-ink) / 0.05)',
        modal: '0 24px 48px -12px rgb(var(--shadow-ink) / 0.25), 0 2px 6px rgb(var(--shadow-ink) / 0.08)',
        focus: '0 0 0 3px rgb(var(--brand-green-fresh) / 0.25)',
        // Legacy names.
        glass: '0 1px 2px rgb(var(--shadow-ink) / 0.04), 0 1px 3px rgb(var(--shadow-ink) / 0.05)',
        'glass-lg': '0 4px 14px -4px rgb(var(--shadow-ink) / 0.12), 0 1px 3px rgb(var(--shadow-ink) / 0.05)',
        glow: '0 4px 14px -4px rgb(var(--brand-green-fresh) / 0.35)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        emphasized: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.32s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.2s ease-out both',
        'scale-in': 'scale-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-up': 'sheet-up 0.32s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.8s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
