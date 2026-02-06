/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './krispc/templates/**/*.html',
    './krispc/static/src/**/*.{vue,js}',
    './p2c/templates/**/*.html',
    './hub/templates/**/*.html',
    './plexus/templates/**/*.html',
    './templates/**/*.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#CA8A04',
          dark: '#A16207',
          light: '#FDE68A',
        },
        accent: {
          DEFAULT: '#44403C',
          dark: '#292524',
          light: '#78716C',
        },
      },
      fontFamily: {
        brand: ['Playfair Display', 'serif'],
        sans: ['Source Sans 3', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
