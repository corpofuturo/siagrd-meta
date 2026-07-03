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
        // Tokens del tema oscuro anterior — se conservan temporalmente porque
        // ~19 paginas de listado (Paso 8 del rediseno) aun los usan y no
        // fueron reescritas linea por linea en esta pasada. Eliminar cuando
        // se migren esas paginas al patron blanco/azul institucional.
        'bg-primary': '#0A0E1A',
        'bg-secondary': '#111827',
        'bg-tertiary': '#1E2535',
        'text-primary': '#F0F4FF',
        'text-secondary': '#8B9CC8',
        border: '#2D3748',
        surface: '#1E2535',
        alert: {
          verde: '#16A34A',
          amarillo: '#D97706',
          naranja: '#EA580C',
          rojo: '#DC2626',
        },
        // Sidebar / panel interno
        sidebar: {
          bg:         '#1e3a5f',   // blue-900 corporativo
          hover:      '#1a3352',
          active:     '#0f2540',
          border:     '#163155',
          text:       '#ffffff',
          muted:      '#93c5fd',   // blue-300
          label:      '#60a5fa',   // blue-400 (etiquetas de sección)
        },
        // Navbar superior
        navbar: {
          bg:         '#ffffff',
          border:     '#e5e7eb',   // gray-200
          text:       '#1e3a5f',
          muted:      '#6b7280',
        },
        // Fondo general de páginas
        panel: {
          bg:         '#f9fafb',   // gray-50
          card:       '#ffffff',
          border:     '#e5e7eb',
          text:       '#111827',
          muted:      '#6b7280',
        },
        // Niveles de alerta (mantener semántica)
        alerta: {
          verde:    { bg: '#dcfce7', text: '#166534', border: '#86efac' },
          amarillo: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
          naranja:  { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
          rojo:     { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
        },
        // Paleta Indigo Pro — oficial del sistema
        brand: {
          DEFAULT:  '#4f46e5',
          hover:    '#4338ca',
          light:    '#e0e7ff',
          lighter:  '#eef2ff',
          dark:     '#312e81',
          darker:   '#1e1b4b',
          border:   '#c7d2fe',
          text:     '#312e81',
        },
      },
      fontFamily: {
        sans: ["'Segoe UI'", 'system-ui', '-apple-system', 'sans-serif'],
        // Conservados por las mismas ~19 paginas de listado del tema anterior.
        display: ['var(--font-display)', 'Barlow Condensed', 'sans-serif'],
        body: ['var(--font-body)', 'IBM Plex Sans', 'sans-serif'],
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
  plugins: [require('tailwindcss-animate')],
};

export default config;
