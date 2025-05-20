/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'open-sans': ['"Open Sans"', 'sans-serif'],
        'roboto': ['Roboto', 'sans-serif'],
        'arizonia':['Arizonia','sans-serif'],
        'noto':['Noto Sans Display', 'sans-serif'],
        'lato':['Lato','sans-serif'],
        'mon':['Montserrat','sans-serif']
      },
    },
  },
  plugins: [],
}
