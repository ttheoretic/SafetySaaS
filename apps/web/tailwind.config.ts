import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0f17',
        panel: '#121826',
        panel2: '#1a2234',
        border: '#232c40',
        accent: '#3b82f6',
        good: '#22c55e',
        warn: '#f59e0b',
        bad: '#ef4444',
        muted: '#8b97ad',
      },
    },
  },
  plugins: [],
} satisfies Config;
