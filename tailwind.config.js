/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Robinhood-inspired color palette
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Robinhood green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Financial colors - Robinhood style
        gain: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Robinhood green
          600: '#16a34a',
          700: '#15803d',
        },
        loss: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Robinhood red
          600: '#dc2626',
          700: '#b91c1c',
        },
        // Neutral colors - Robinhood dark theme
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Robinhood dark theme colors
        robinhood: {
          dark: '#000000',
          'dark-secondary': '#1a1a1a',
          'dark-tertiary': '#2a2a2a',
          'dark-border': '#333333',
          'dark-text': '#ffffff',
          'dark-text-secondary': '#a3a3a3',
          'dark-text-tertiary': '#737373',
        },
        // Chart colors
        chart: {
          green: '#22c55e',
          red: '#ef4444',
          blue: '#3b82f6',
          purple: '#8b5cf6',
          orange: '#f97316',
          yellow: '#eab308',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '16px', letterSpacing: '0.025em' }],
        'sm': ['14px', { lineHeight: '20px', letterSpacing: '0.025em' }],
        'base': ['16px', { lineHeight: '24px', letterSpacing: '0.025em' }],
        'lg': ['18px', { lineHeight: '28px', letterSpacing: '0.025em' }],
        'xl': ['20px', { lineHeight: '28px', letterSpacing: '0.025em' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '0.025em' }],
        '3xl': ['30px', { lineHeight: '36px', letterSpacing: '0.025em' }],
        '4xl': ['36px', { lineHeight: '40px', letterSpacing: '0.025em' }],
        '5xl': ['48px', { lineHeight: '48px', letterSpacing: '0.025em' }],
      },
      fontWeight: {
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
        'elevated': '0 4px 12px 0 rgba(0, 0, 0, 0.08)',
        'robinhood': '0 2px 8px 0 rgba(0, 0, 0, 0.12)',
        'robinhood-lg': '0 8px 24px 0 rgba(0, 0, 0, 0.16)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        'robinhood': '12px',
        'robinhood-lg': '16px',
        'robinhood-xl': '20px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        'robinhood': '12px',
      },
      backgroundImage: {
        'gradient-robinhood': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'gradient-robinhood-dark': 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
    },
  },
  plugins: [],
}
