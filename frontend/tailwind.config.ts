import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream:      '#fdf6ec',
        parchment:  '#f5e6ce',
        terracotta: '#c1604a',
        terra2:     '#e8876a',
        sage:       '#6b8f71',
        sage2:      '#92b899',
        gold:       '#d4952a',
        gold2:      '#f0b84a',
        clay:       '#a0522d',
        blush:      '#e8c5a0',
        espresso:   '#2c1a0e',
        bark:       '#5c3d1e',
        warm:       '#8a6545',
        mist:       '#c9b99a',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'paper': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
export default config
