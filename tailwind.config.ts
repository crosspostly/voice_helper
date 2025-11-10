import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Новые цвета под твою стилистику
        base: '#FFF8F5', // очень светлый грейпфрут, почти бежевый
        grapefruit: '#FEEADE', // бледно-грейпфрутовый, чуть насыщенней
        accent: '#47B881', // лайм зелёный (primary green)
        accent2: '#F87171', // красный (для ошибок или внимания)
        grapefruitDark: '#F6D3BE', // тёплый оттенок бледного
        card: '#FFFFFF',
        border: '#EDE0D4',
        text: '#27362c',
      },
      boxShadow: {
        card: '0 4px 24px rgba(60, 60, 60, 0.09)',
      },
      borderRadius: {
        card: '1.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config
