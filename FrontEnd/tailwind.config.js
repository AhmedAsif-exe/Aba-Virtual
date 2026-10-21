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
        // Supervision portal sub-brand.
        violet: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#4c1d95",
          900: "#2e1065",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(4,37,57,0.06), 0 8px 24px -6px rgba(4,37,57,0.12)",
        lift: "0 2px 4px rgba(4,37,57,0.06), 0 18px 40px -10px rgba(4,37,57,0.22)",
        glow: "0 0 0 1px rgba(167,139,250,0.35), 0 20px 60px -15px rgba(124,58,237,0.55)",
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
