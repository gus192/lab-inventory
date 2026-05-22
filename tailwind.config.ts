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
        lab: {
          blue: '#1e3a5f',
          teal: '#0d9488',
          light: '#f0f7ff',
        },
      },
    },
  },
  plugins: [],
}
export default config
