/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7f1',
          100: '#dcebdf',
          200: '#bcd8c2',
          300: '#8fbd9b',
          400: '#5f9c70',
          500: '#3f7f52',
          600: '#2e6540',
          700: '#265134',
          800: '#20412c',
          900: '#1b3625',
        },
        earth: {
          50: '#fbf7ef',
          100: '#f4ead6',
          200: '#e8d3ac',
          300: '#d9b77c',
          400: '#c99853',
          500: '#b47d38',
          600: '#9a622e',
          700: '#7c4b28',
          800: '#663e26',
          900: '#563423',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans Kannada"', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.06), 0 8px 24px -12px rgba(16, 24, 40, 0.18)',
      },
    },
  },
  plugins: [],
};
