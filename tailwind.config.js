/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f7fbfc',
        card: '#ffffff',
        ink: '#0b0f14',
        muted: '#5b6b7a',
        line: '#e6eef2',
        aqua: {
          1: '#e8fbff',
          2: '#c9f3ff',
          3: '#8fe6ff',
          4: '#35c9f2',
          5: '#0aa6d3',
        },
        ok: '#13b981',
        warn: '#f59e0b',
        bad: '#ef4444',
      },
    },
  },
  plugins: [],
}
