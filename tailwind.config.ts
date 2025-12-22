import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'tf2-orange': 'var(--tf2-orange)',
        'tf2-red': 'var(--tf2-red)',
        'tf2-blue': 'var(--tf2-blue)',
        'tf2-yellow': 'var(--tf2-yellow)',
        'tf2-dark': 'var(--tf2-dark)',
        'tf2-light': 'var(--tf2-light)',
        'tf2-border': 'var(--tf2-border)',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}

export default config