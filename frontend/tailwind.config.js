/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { serif: ['"Playfair Display"', 'serif'] },
      colors: { primary: { DEFAULT: '#2d6a4f', light: '#52b788', dark: '#1b4332' } },
    },
  },
  plugins: [],
};
