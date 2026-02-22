/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
        },
        accent: 'var(--accent)',
        surface: {
          DEFAULT: 'var(--surface)',
          dark: 'var(--surface-dark)',
        },
        text: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
        },
        border: 'var(--border)',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      spacing: {
        'space-xs': 'var(--space-xs)',
        'space-sm': 'var(--space-sm)',
        'space-md': 'var(--space-md)',
        'space-lg': 'var(--space-lg)',
        'space-xl': 'var(--space-xl)',
        'space-2xl': 'var(--space-2xl)',
      },
      borderRadius: {
        'radius-sm': 'var(--radius-sm)',
        'radius-md': 'var(--radius-md)',
        'radius-lg': 'var(--radius-lg)',
      },
      boxShadow: {
        'shadow-sm': 'var(--shadow-sm)',
        'shadow-md': 'var(--shadow-md)',
      },
    },
  },
  plugins: [],
}
