/** @type {import('tailwindcss').Config} */
const preset = require('../../packages/config/tailwind-preset');

module.exports = {
  presets: [preset],
  // You can add app-specific customizations here if needed
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
};
