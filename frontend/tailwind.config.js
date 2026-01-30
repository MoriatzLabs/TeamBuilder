/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'c9-blue': '#00A8E1',
        'c9-dark': '#0C2237',
        'c9-gold': '#D4AF37',
      },
    },
  },
  plugins: [],
}
