/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Every brand colour resolves through a CSS variable holding space-separated
      // RGB channels. That lets the accent picker and dark mode reskin the whole
      // app by swapping variables, without a single class name changing.
      // See the :root / [data-theme] / [data-accent] blocks in index.css.
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
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.5rem',
        xl3: '2rem',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(11, 61, 46, 0.14)',
        'glass-lg': '0 20px 60px -10px rgba(11, 61, 46, 0.25)',
        glow: '0 0 40px -8px rgba(31, 174, 107, 0.45)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
