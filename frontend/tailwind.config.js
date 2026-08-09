/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        solar: {
          dark: '#0f172a',
          primary: '#0d9488', // teal-600
          primaryHover: '#0f766e', // teal-700
          accent: '#eab308', // yellow-500
          green: '#10b981', // emerald-500
          red: '#ef4444', // red-500
          orange: '#f97316', // orange-500
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
