/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FBF9F4',
          100: '#F5F0E6',
          200: '#EAE0CE',
          300: '#D8C9B0',
          400: '#B8A589',
        },
        forest: {
          50: '#EFF6F1',
          100: '#D7E9DC',
          500: '#2E6B47',
          600: '#235337',
          700: '#1B402A',
          800: '#132D1E',
        },
        emeraldPixel: {
          400: '#34D399',
          500: '#17A34A',
          600: '#15803D',
        },
        earth: {
          700: '#4A3F35',
          800: '#352D25',
          900: '#231D17',
        },
      },
      boxShadow: {
        block: '4px 4px 0px 0px #D8C9B0',
        'block-sm': '2px 2px 0px 0px #D8C9B0',
        'block-forest': '4px 4px 0px 0px #1B402A',
      },
    },
  },
  plugins: [],
};
