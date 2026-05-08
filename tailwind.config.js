/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './krispc/templates/**/*.html',
    './krispc/static/src/**/*.{vue,js}',
    './p2c/templates/**/*.html',
    './p2c/static/js/**/*.js',
    './hub/templates/**/*.html',
    './plexus/templates/**/*.html',
    './templates/**/*.html',
  ],
  safelist: [
    'bg-red-600', 'bg-red-700',
    'bg-green-600', 'bg-green-700', 'bg-green-800',
    'text-white',
    'focus:ring-red-500', 'focus:ring-green-500', 'focus:ring-green-600',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#CA8A04',
          dark: '#A16207',
          light: '#EAB308',
        },
        accent: {
          DEFAULT: '#00d4aa',
          dark: '#00a888',
          light: '#33e0bf',
        },
      },
      fontFamily: {
        brand: ['"Playfair Display"', 'serif'],
        sans: ['"Source Sans 3"', 'sans-serif'],
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
