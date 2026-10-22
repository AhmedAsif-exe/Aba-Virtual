/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        raleway: ["Raleway", "sans-serif"],
        display: ["Raleway", "Inter", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        londrina: ["Londrina Solid", "cursive"],
      },
      colors: {
        // Brand, from the logo.
        navy: "#042539",
        brand: "#265c7e",
        teal: "#45B4B3",
        coral: "#f97544",
        // Client palette: #FBFBFB, #4BB7BA, #4B9ABB, #265C7E, #EC5923.
        paper: "#FBFBFB",
        aqua: "#4BB7BA",
        ember: "#EC5923",
        // Tints and shades of #4B9ABB (500) down to #265C7E (700), for the
        // supervision sections.
        sea: {
          50: "#f2f8fb",
          100: "#e3f0f6",
          200: "#c4e0ec",
          300: "#9cc8dc",
          400: "#6fb0cb",
          500: "#4B9ABB",
          600: "#387b9c",
          700: "#265C7E",
          800: "#1a4560",
          900: "#0e2f45",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(4,37,57,0.06), 0 8px 24px -6px rgba(4,37,57,0.12)",
        lift: "0 2px 4px rgba(4,37,57,0.06), 0 18px 40px -10px rgba(4,37,57,0.22)",
        glow: "0 0 0 1px rgba(75,183,186,0.35), 0 20px 60px -15px rgba(75,154,187,0.55)",
      },
    },
    screens: {
      ms: "321px",
      mm: "376px",
      ml: "426px",
      t: "769px",
      l: "1025px",
      ll: "1441px",
    },
  },
  plugins: [],
};
