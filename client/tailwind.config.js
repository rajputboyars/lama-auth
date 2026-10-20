/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#05070d',
        panel: '#0b1020',
        edge: '#1b2440',
        neon: { cyan: '#22d3ee', pink: '#f472b6', violet: '#a78bfa', lime: '#a3e635' },
        win: '#34d399',
        loss: '#f87171',
      },
      fontFamily: {
        display: ['Orbitron', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(34,211,238,0.35)',
        'glow-pink': '0 0 20px rgba(244,114,182,0.35)',
        'glow-win': '0 0 16px rgba(52,211,153,0.35)',
        'glow-loss': '0 0 16px rgba(248,113,113,0.35)',
      },
      keyframes: {
        pulseDot: {
          '0%,100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.4, transform: 'scale(1.6)' },
        },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
};
