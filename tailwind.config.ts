import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vodafone: {
          red: '#e60000',
          darkred: '#990000',
          gray: '#4a4d4e',
          lightgray: '#f4f4f4',
        },
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#e60000',
          600: '#dc2626',
          700: '#990000',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
