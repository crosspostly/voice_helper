/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-base',
    'bg-grapefruit',
    'bg-grapefruitDark',
    'bg-accent',
    'bg-accent2',
    'bg-card',
    'text-text',
    'border-border',
    'rounded-card',
    'shadow-card',
  ],
  theme: {
    extend: {
      colors: {
        base: "#FFF8F5",
        grapefruit: "#FEEADE",
        accent: "#47B881",
        accent2: "#F87171",
        grapefruitDark: "#F6D3BE",
        card: "#FDF6ED",
        border: "#E9D6C7",
        text: "#3C2B1C",
      },
      boxShadow: {
        card: "0 4px 24px rgba(60, 60, 60, 0.09)",
      },
      borderRadius: {
        card: "1.5rem",
      },
    },
  },
  plugins: [],
};
