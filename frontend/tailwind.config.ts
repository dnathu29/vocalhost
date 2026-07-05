import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        clay:    '#c4a882',
        ember:   '#e07a5f',
        sage:    '#7a9e7e',
        ink:     '#0f0e0d',
        parchment: '#f0ece4',
        canvas:  '#1a1814',
        surface: '#242019',
        muted:   '#6b6355',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
