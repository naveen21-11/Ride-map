/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: '#0b0f19',
        slate: { panel: '#0f172a' },
        emerald: { primary: '#10b981' },
        teal: { secondary: '#14b8a6' },
        amber: { accent: '#f59e0b' },
        tgb: {
          orange: '#f97316',
          'orange-hover': '#ea580c',
          accent: '#ff5500',
          dark: '#0b0f19',
          card: '#111827',
          grey: '#1f2937',
          light: '#f9fafb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        glass: '16px',
      },
    },
  },
  plugins: [],
}
