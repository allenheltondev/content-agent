/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Betterer brand colors
        primary: {
          DEFAULT: '#219EFF',
          hover: '#1e8ae6',
        },
        secondary: {
          DEFAULT: '#FFB02E',
          hover: '#e69a29',
        },
        tertiary: {
          DEFAULT: '#2B2D42',
        },
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
      },
      screens: {
        'xs': '475px',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}
