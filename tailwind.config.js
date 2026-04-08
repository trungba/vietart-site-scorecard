/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1B2A4A",
        slate: "#37474F",
        brand: { blue: "#1565C0", teal: "#00897B", green: "#2E7D32", orange: "#E65100", red: "#C62828", gold: "#F9A825" },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
