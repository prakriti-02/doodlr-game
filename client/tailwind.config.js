/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        game: {
          bg: '#0f172a',
          surface: '#1e293b',
          card: '#273549',
          border: '#334155',
          primary: '#6366f1',
          primaryHover: '#4f46e5',
          accent: '#f59e0b',
          success: '#10b981',
          danger: '#ef4444',
        }
      },
      fontFamily: {
        game: ['"Fredoka"', 'Quicksand', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}
