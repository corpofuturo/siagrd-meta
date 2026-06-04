import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Fondos del sistema
        'bg-primary': '#0A0E1A',
        'bg-secondary': '#111827',
        'bg-tertiary': '#1E2535',
        // Textos
        'text-primary': '#F0F4FF',
        'text-secondary': '#8B9CC8',
        // Bordes
        border: '#2D3748',
        surface: '#1E2535',
        // Niveles de alerta
        alert: {
          verde: '#16A34A',
          amarillo: '#D97706',
          naranja: '#EA580C',
          rojo: '#DC2626',
        },
      },
      fontFamily: {
        display: ['Barlow Condensed', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      animation: {
        'pulse-red': 'pulse-red 800ms ease-in-out infinite',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
