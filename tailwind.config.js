const { fontFamily } = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans]
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        /* ---- Material Design 3 Rollen (RGB-Triplets, Alpha-fähig) ---- */
        surface: {
          DEFAULT: 'rgb(var(--md-rgb-surface) / <alpha-value>)',
          dim: 'rgb(var(--md-rgb-surface-dim) / <alpha-value>)',
          container: {
            DEFAULT: 'rgb(var(--md-rgb-surface-container) / <alpha-value>)',
            lowest:
              'rgb(var(--md-rgb-surface-container-lowest) / <alpha-value>)',
            low: 'rgb(var(--md-rgb-surface-container-low) / <alpha-value>)',
            high: 'rgb(var(--md-rgb-surface-container-high) / <alpha-value>)',
            highest:
              'rgb(var(--md-rgb-surface-container-highest) / <alpha-value>)'
          }
        },
        'on-surface': {
          DEFAULT: 'rgb(var(--md-rgb-on-surface) / <alpha-value>)',
          variant: 'rgb(var(--md-rgb-on-surface-variant) / <alpha-value>)'
        },
        'primary-container':
          'rgb(var(--md-rgb-primary-container) / <alpha-value>)',
        'on-primary-container':
          'rgb(var(--md-rgb-on-primary-container) / <alpha-value>)',
        'secondary-container':
          'rgb(var(--md-rgb-secondary-container) / <alpha-value>)',
        'on-secondary-container':
          'rgb(var(--md-rgb-on-secondary-container) / <alpha-value>)',
        tertiary: 'rgb(var(--md-rgb-tertiary) / <alpha-value>)',
        'on-tertiary': 'rgb(var(--md-rgb-on-tertiary) / <alpha-value>)',
        'tertiary-container':
          'rgb(var(--md-rgb-tertiary-container) / <alpha-value>)',
        'on-tertiary-container':
          'rgb(var(--md-rgb-on-tertiary-container) / <alpha-value>)',
        outline: 'rgb(var(--md-rgb-outline) / <alpha-value>)',
        'outline-variant':
          'rgb(var(--md-rgb-outline-variant) / <alpha-value>)',
        error: 'rgb(var(--md-rgb-error) / <alpha-value>)',
        'on-error': 'rgb(var(--md-rgb-on-error) / <alpha-value>)',
        'error-container': 'rgb(var(--md-rgb-error-container) / <alpha-value>)',
        'on-error-container':
          'rgb(var(--md-rgb-on-error-container) / <alpha-value>)',
        'inverse-surface': 'rgb(var(--md-rgb-inverse-surface) / <alpha-value>)',
        'inverse-on-surface':
          'rgb(var(--md-rgb-inverse-on-surface) / <alpha-value>)',
        'inverse-primary': 'rgb(var(--md-rgb-inverse-primary) / <alpha-value>)'
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 }
        },
        'slide-from-left': {
          '0%': {
            transform: 'translateX(-100%)'
          },
          '100%': {
            transform: 'translateX(0)'
          }
        },
        'slide-to-left': {
          '0%': {
            transform: 'translateX(0)'
          },
          '100%': {
            transform: 'translateX(-100%)'
          }
        },
        /* ---- M3 Motion (Dialog/Sheet/Tooltip/Overlay) ---- */
        'm3-fade-in': {
          from: { opacity: 0 },
          to: { opacity: 1 }
        },
        'm3-fade-out': {
          from: { opacity: 1 },
          to: { opacity: 0 }
        },
        'm3-dialog-in': {
          from: { opacity: 0, transform: 'scale(0.85)' },
          to: { opacity: 1, transform: 'scale(1)' }
        },
        'm3-dialog-out': {
          from: { opacity: 1, transform: 'scale(1)' },
          to: { opacity: 0, transform: 'scale(0.95)' }
        },
        'm3-sheet-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' }
        },
        'm3-sheet-out': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' }
        }
      },
      animation: {
        'slide-from-left':
          'slide-from-left 0.3s cubic-bezier(0.82, 0.085, 0.395, 0.895)',
        'slide-to-left':
          'slide-to-left 0.25s cubic-bezier(0.82, 0.085, 0.395, 0.895)',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        /* ---- M3 Motion: open 400ms emphasized-decelerate,
             close 200ms emphasized-accelerate ---- */
        'm3-fade-in':
          'm3-fade-in 400ms var(--m3-easing-emphasized-decelerate)',
        'm3-fade-out':
          'm3-fade-out 200ms var(--m3-easing-emphasized-accelerate)',
        'm3-dialog-in':
          'm3-dialog-in 400ms var(--m3-easing-emphasized-decelerate)',
        'm3-dialog-out':
          'm3-dialog-out 200ms var(--m3-easing-emphasized-accelerate)',
        'm3-sheet-in':
          'm3-sheet-in 400ms var(--m3-easing-emphasized-decelerate)',
        'm3-sheet-out':
          'm3-sheet-out 200ms var(--m3-easing-emphasized-accelerate)'
      }
    }
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')]
}
