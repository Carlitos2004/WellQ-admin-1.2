/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',        // ← línea nueva
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}