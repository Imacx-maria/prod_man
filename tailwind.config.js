/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.25rem' }],   // 12px
        sm: ['0.875rem', { lineHeight: '1.5rem' }],   // 14px
        base: ['1rem', { lineHeight: '1.75rem' }],    // 16px
        lg: ['1.125rem', { lineHeight: '2rem' }],     // 18px
        xl: ['1.25rem', { lineHeight: '2.25rem' }],   // 20px
        '2xl': ['1.5rem', { lineHeight: '2.5rem' }],  // 24px
      },
      colors: {
        border: 'var(--border)',
        input: 'var(--border)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--color-main)',
          foreground: 'var(--color-main-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',
          foreground: 'var(--color-destructive-foreground)',
        },
        muted: {
          DEFAULT: 'oklch(92.49% 0 0 / 0.5)',
          foreground: 'var(--foreground)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--secondary-background)',
          foreground: 'var(--foreground)',
        },
        card: {
          DEFAULT: 'var(--secondary-background)',
          foreground: 'var(--foreground)',
        },
        dropdown: {
          DEFAULT: 'var(--dropdown-bg)',
        },
      },
      borderRadius: {
        DEFAULT: 'var(--radius-base)',
        lg: 'var(--radius-base)',
        md: 'var(--radius-base)',
        sm: 'var(--radius-base)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      boxShadow: {
        DEFAULT: 'var(--shadow-shadow)',
      },
    },
    screens: {
      'hd': '1920px',
      '2xl': '1536px',
      'xl': '1280px',
      'lg': '1024px',
      'md': '768px',
      'sm': '640px',
    },
  },
  plugins: [require('tailwindcss-animate')],
}
