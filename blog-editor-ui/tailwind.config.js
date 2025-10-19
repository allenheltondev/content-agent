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
          DEFAULT: '#2B2D42', // Dark blue-gray for high contrast
        },
        // Accessible gray colors with better contrast
        'gray-600': '#4B5563', // Ensures AA compliance on white
        'gray-700': '#374151', // Ensures AA compliance on white
        'gray-800': '#1F2937', // Ensures AAA compliance on white
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
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'expand': 'expand 0.3s ease-out',
        'collapse': 'collapse 0.3s ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        expand: {
          '0%': {
            maxHeight: '0',
            opacity: '0',
            transform: 'scaleY(0.8)',
          },
          '100%': {
            maxHeight: '500px',
            opacity: '1',
            transform: 'scaleY(1)',
          },
        },
        collapse: {
          '0%': {
            maxHeight: '500px',
            opacity: '1',
            transform: 'scaleY(1)',
          },
          '100%': {
            maxHeight: '0',
            opacity: '0',
            transform: 'scaleY(0.8)',
          },
        },
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
        'colors-shadow': 'color, background-color, border-color, text-decoration-color, fill, stroke, box-shadow',
      },
    },
  },
  plugins: [],
}
