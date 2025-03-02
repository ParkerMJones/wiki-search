/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "wiki-blue": "#3366cc",
        "wiki-link": "#0645ad",
        "wiki-visited": "#0b0080",
        "wiki-bg": "#ffffff",
        "wiki-header": "#f8f9fa",
        "wiki-border": "#a2a9b1",
      },
      fontFamily: {
        wiki: ["Linux Libertine", "Georgia", "Times", "serif"],
        "wiki-sans": ["sans-serif"],
      },
    },
  },
  plugins: [],
};
