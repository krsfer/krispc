/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './krispc/templates/**/*.html',
    './krispc/static/src/**/*.{vue,js}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ffc451',
          dark: '#e6a821',
          light: '#ffd584',
        },
        accent: {
          DEFAULT: '#00d4aa',
          dark: '#00a888',
          light: '#33e0bf',
        },
      },
      fontFamily: {
        brand: ['Lobster', 'cursive'],
        sans: ['Inter', 'sans-serif'],
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

