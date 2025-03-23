/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#4A8CCA',
          DEFAULT: '#1677ff',
          dark: '#0958d9',
        },
        secondary: {
          light: '#9BA1AD',
          DEFAULT: '#6B7280',
          dark: '#4B5563',
        },
        agent: {
          light: '#FBE5D6',
          DEFAULT: '#F7941D',
          dark: '#D97706',
        }
      },
    },
  },
  plugins: [],
} 