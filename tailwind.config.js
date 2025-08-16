/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gymGold: "#C29B2C",
        nutritionGreen: "#16a34a",
        bodyBlue: "#2563eb"
      }
    }
  },
  plugins: []
};
