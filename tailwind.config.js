/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sebrae: {
          blue: '#00558C',
          "blue-dark": '#004a8f', // Azul mais escuro para o header
          green: '#8BC53F',
          dark: '#3c3c3c',
          "danger-red": '#e63946', // Vermelho para botões de ação destrutiva
          "danger-red-hover": '#c62828',
        },
      },
    },
  },
  plugins: [],
}