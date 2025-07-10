/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        havyn: {
          primary: '#3F6B28',
          dark: '#345A22',
          light: '#4C8032',
          lighter: '#5A994C',
          lightest: '#68B359'
        }
      }
    },
  },
  plugins: [],
};