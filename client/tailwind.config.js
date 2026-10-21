import animate from 'tailwindcss-animate';

const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        secondary: { DEFAULT: token('secondary'), foreground: token('secondary-foreground') },
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
        destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
        popover: { DEFAULT: token('popover'), foreground: token('popover-foreground') },
        card: { DEFAULT: token('card'), foreground: token('card-foreground') },
        win: token('win'),
        loss: token('loss'),
        warn: token('warn'),
        c: {
          coral: token('c-coral'),
          teal: token('c-teal'),
          green: token('c-green'),
          violet: token('c-violet'),
          indigo: token('c-indigo'),
          navy: token('c-navy'),
        },
      },
      borderRadius: {
        '3xl': '1.75rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // Neumorphism: a dark shadow bottom-right and a light one top-left of the same surface.
        soft: '5px 5px 12px hsl(var(--neu-dark) / 0.55), -5px -5px 12px hsl(var(--neu-light) / 0.9)',
        lift: '12px 12px 28px hsl(var(--neu-dark) / 0.55), -12px -12px 28px hsl(var(--neu-light) / 0.9)',
        'neu-inset':
          'inset 4px 4px 9px hsl(var(--neu-dark) / 0.6), inset -4px -4px 9px hsl(var(--neu-light) / 0.9)',
        'neu-sm': '3px 3px 6px hsl(var(--neu-dark) / 0.5), -3px -3px 6px hsl(var(--neu-light) / 0.85)',
        glow: '0 12px 28px -10px hsl(var(--primary) / 0.65)',
      },
      keyframes: {
        pulseDot: {
          '0%,100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.4, transform: 'scale(1.6)' },
        },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
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
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
};
