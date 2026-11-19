/** @type {import('tailwindcss').Config} */
// Brand palette taken from the official AI Product Wizardry brochure:
//   deep teal hero · teal accents · burnt-orange badges · mustard/gold highlights ·
//   warm cream canvas · pastel mist / peach / sand cards · near-black ink.
// Every component uses these tokens, so the whole UI follows the brochure.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep teal ink — headings, dark surfaces (brochure hero / module 11 card)
        primary: {
          DEFAULT: '#163A36',
          50: '#F7F4EE',
          100: '#EFE9DF',
          200: '#E2DACD',
          300: '#C9C0B1',
          400: '#9E968A',
          500: '#6E6A62',
          600: '#3F5551',
          700: '#2E4642',
          800: '#1F3532',
          900: '#163A36',
          950: '#0E2724',
        },
        // Body copy — teal-tinted charcoal
        secondary: {
          DEFAULT: '#34433F',
          light: '#5F6B67',
          dark: '#24302D',
          slate: '#3F5551',
        },
        // Brand teal — primary actions, links, highlights
        accent: {
          DEFAULT: '#2A6F68',
          hover: '#225B55',
          dark: '#1B4A45',
          light: '#BFDAD5',
          subtle: '#E6F1EE',
          bright: '#3D8E85',
        },
        // Burnt orange from the brochure badges (kept under the existing token name)
        cerulean: {
          DEFAULT: '#D4552B',
          hover: '#BC4620',
          dark: '#9F3A19',
          light: '#F3D3C4',
          subtle: '#FBEDE6',
        },
        ember: {
          DEFAULT: '#D4552B',
          hover: '#BC4620',
          dark: '#9F3A19',
          light: '#F3D3C4',
          subtle: '#FBEDE6',
        },
        mustard: {
          DEFAULT: '#C98A1F',
          hover: '#B07818',
          dark: '#8A5D10',
          light: '#F1DDB0',
          subtle: '#F8EDD3',
        },
        gold: '#F2B63D',
        star: '#F7941D',
        mist: '#E2EEEB',
        peach: '#F4DBCF',
        sand: '#F6E7C6',
        cream: '#FAF6EF',
        ink: '#151817',
        hero: {
          from: '#123C38',
          via: '#1C4D48',
          to: '#2B6A63',
        },
        // Light inner panels (cream). The PAGE canvas is the dark teal `canvas` below.
        background: '#F8F4ED',
        canvas: {
          DEFAULT: '#1B3532',
          deep: '#14292A',
          raised: '#22403C',
        },
        surface: {
          DEFAULT: '#FBF8F2',
          subtle: '#F3EEE5',
          muted: '#EAE2D6',
          dark: '#163A36',
        },
        text: {
          DEFAULT: '#1E2826',
          muted: '#5E6662',
          light: '#959A96',
          inverse: '#F8F4ED',
        },
        border: {
          DEFAULT: '#E5DDD0',
          subtle: '#EFE9DF',
          strong: '#CCC2B3',
          dark: '#2E4642',
        },
        // Neutral greys warmed to sit on the cream canvas
        slate: {
          50: '#F6F3EE',
          100: '#EEEAE3',
          200: '#E2DDD4',
          300: '#CBC5BA',
          400: '#A29D93',
          500: '#7A776F',
          600: '#5D5B55',
          700: '#45443F',
          800: '#2E2D2A',
          900: '#1E1D1B',
          950: '#121211',
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
        'subtle': '0 1px 3px 0 rgba(22, 58, 54, 0.05), 0 1px 2px -1px rgba(22, 58, 54, 0.05)',
        'card': '0 4px 6px -1px rgba(22, 58, 54, 0.05), 0 2px 4px -2px rgba(22, 58, 54, 0.05)',
        'premium': '0 10px 25px -5px rgba(42, 111, 104, 0.22), 0 8px 10px -6px rgba(22, 58, 54, 0.06)',
        'elevated': '0 20px 25px -5px rgba(22, 58, 54, 0.10), 0 8px 10px -6px rgba(22, 58, 54, 0.06)',
        'glow': '0 0 0 6px rgba(42, 111, 104, 0.12)',
      },
      borderRadius: {
        'card': '0.75rem',
        'button': '0.5rem',
      },
      keyframes: {
        'aiw-float': { '0%, 100%': { transform: 'translateY(0) rotate(-6deg)' }, '50%': { transform: 'translateY(-10px) rotate(-2deg)' } },
        'aiw-twinkle': { '0%, 100%': { opacity: '0.35', transform: 'scale(0.85)' }, '50%': { opacity: '1', transform: 'scale(1.1)' } },
        'aiw-fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'aiw-float': 'aiw-float 6s ease-in-out infinite',
        'aiw-twinkle': 'aiw-twinkle 3.2s ease-in-out infinite',
        'aiw-fade-up': 'aiw-fade-up 480ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
