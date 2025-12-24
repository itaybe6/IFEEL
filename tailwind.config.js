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
        gray: {
          950: '#121212', // Not too black
          900: '#1A1A1A', // Very dark gray
          850: '#222222', // Dark gray for cards
          800: '#2A2A2A', // Dark gray for backgrounds
          700: '#333333', // Medium dark gray
          600: '#444444', // Medium gray
          500: '#666666', // Medium gray
          400: '#888888', // Light gray
          300: '#AAAAAA', // Lighter gray
          200: '#CCCCCC', // Very light gray
          100: '#E5E5E5', // Almost white
          50: '#F5F5F5',  // White
        }
      },
    },
  },
  plugins: [],
};