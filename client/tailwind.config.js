/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: 'var(--primary)', hover: 'var(--primary-hover)' },
        accent: 'var(--accent)',
        surface: { DEFAULT: 'var(--surface)', dark: 'var(--surface-dark)' },
        text: { DEFAULT: 'var(--text)', muted: 'var(--text-muted)' },
        border: 'var(--border)',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
