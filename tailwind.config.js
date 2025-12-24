/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heebo: ['Heebo', 'sans-serif'],
      },
      direction: {
        'rtl': 'rtl',
      },
      colors: {
        primary: {
          DEFAULT: '#2D3E3B', // Dark Green/Grey from logo
          light: '#3D524F',
          dark: '#1D2A28',
        },
        secondary: {
          DEFAULT: '#C5A073', // Gold from logo
          light: '#D4B894',
          dark: '#B68852',
        },
        gray: {
          950: '#1a2422', // Deepest green-grey
          900: '#23302d', // Dark green-grey
          850: '#2d3e3b', // Primary logo green
          800: '#384d49', // Mid green-grey
          700: '#4d6662', // Lighter green-grey
          600: '#62807b',
          500: '#7a9994',
          400: '#9db3b0',
          300: '#c0cdcb',
          200: '#e0e6e5',
          100: '#f0f2f2',
          50: '#f8f9f9',
        }
      },
    },
  },
  plugins: [],
};