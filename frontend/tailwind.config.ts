import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '480px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1600px' },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5d9e2',
          300: '#b1b8c7',
          400: '#8791a7',
          500: '#68738c',
          600: '#535c73',
          700: '#444b5e',
          800: '#2c3140',
          900: '#1b1e29',
        },
        brand: {
          50: '#eef5ff',
          100: '#d9e8ff',
          200: '#bcd7ff',
          400: '#5c97f7',
          500: '#3574ec',
          600: '#245ad6',
          700: '#1f48ad',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
