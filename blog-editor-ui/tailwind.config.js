/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Suggestion type colors
        suggestion: {
          llm: {
            bg: '#dbeafe',
            border: '#60a5fa'
          },
          brand: {
            bg: '#e9d5ff',
            border: '#a855f7'
          },
          fact: {
            bg: '#fed7aa',
            border: '#fb923c'
          },
          grammar: {
            bg: '#bbf7d0',
            border: '#4ade80'
          },
          spelling: {
            bg: '#fecaca',
            border: '#f87171'
          }
        }
      }
    },
  },
  plugins: [],
}
