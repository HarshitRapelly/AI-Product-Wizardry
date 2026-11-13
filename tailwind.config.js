/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1C1A17', // Warm Charcoal Espresso (presentation dark canvas)
          50: '#FAF7F2',
          100: '#F4EFEA',
          200: '#E7E1D8',
          300: '#C9C4BB',
          400: '#9C948A',
          500: '#6B645C',
          600: '#44546A', // Steel slate from presentation
          700: '#3D3931', // Dark border from presentation
          800: '#2A2723', // Dark card surface
          900: '#1C1A17', // Deep dark background
          950: '#12110F',
        },
        secondary: {
          DEFAULT: '#3D3931', // Deep Warm Umber
          light: '#6B645C',
          dark: '#2A2723',
          slate: '#44546A', // Steel slate from presentation
        },
        accent: {
          DEFAULT: '#D1531F', // Signature Presentation Terracotta / Burnt Orange
          hover: '#B84414',
          dark: '#9E380E',
          light: '#F7D6C8',
          subtle: '#FDF5F0',
          bright: '#ED7D31',
        },
        cerulean: {
          DEFAULT: '#5B9BD5', // Presentation Cerulean Blue
          hover: '#4A88C5',
          dark: '#326AA0',
          light: '#D6E8F7',
          subtle: '#EEF5FC',
        },
        background: '#FAF7F2', // Warm Ivory Cream (presentation light canvas)
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F4EFEA',
          muted: '#ECE5DC',
          dark: '#2A2723',
        },
        text: {
          DEFAULT: '#1C1A17', // Warm Deep Charcoal
          muted: '#6B645C',   // Warm Muted Umber
          light: '#9C948A',
          inverse: '#FAF7F2',
        },
        border: {
          DEFAULT: '#E7E1D8', // Warm Light Border
          subtle: '#F0EAE1',
          strong: '#C9C4BB', // Presentation Divider
          dark: '#3D3931',
        },
        success: {
          DEFAULT: '#10B981',
          subtle: '#ECFDF5',
          text: '#065F46',
        },
        warning: {
          DEFAULT: '#F59E0B',
          subtle: '#FFFBEB',
          text: '#92400E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(28, 26, 23, 0.04), 0 1px 2px -1px rgba(28, 26, 23, 0.04)',
        'card': '0 4px 6px -1px rgba(28, 26, 23, 0.04), 0 2px 4px -2px rgba(28, 26, 23, 0.04)',
        'premium': '0 10px 25px -5px rgba(209, 83, 31, 0.15), 0 8px 10px -6px rgba(28, 26, 23, 0.04)',
        'elevated': '0 20px 25px -5px rgba(28, 26, 23, 0.08), 0 8px 10px -6px rgba(28, 26, 23, 0.05)',
      },
      borderRadius: {
        'card': '0.75rem',
        'button': '0.5rem',
      }
    },
  },
  plugins: [],
}
