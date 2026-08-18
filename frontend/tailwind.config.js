/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: '#030712',
        slate: { panel: '#0f172a' },
        emerald: { primary: '#10b981' },
        teal: { secondary: '#14b8a6' },
        amber: { accent: '#f59e0b' },
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
