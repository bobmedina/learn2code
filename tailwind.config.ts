import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'kids-blue': '#4CC9F0',
        'kids-yellow': '#F9C74F',
        'kids-purple': '#7209B7',
        'kids-green': '#06D6A0',
        'kids-red': '#EF233C',
        'kids-orange': '#FB8500',
      },
      borderRadius: {
        'xl': '2rem',
        '2xl': '3rem',
      },
      fontFamily: {
        kids: ['Nunito', 'Fredoka One', 'Comic Neue', 'sans-serif'],
      },
      fontSize: {
        'step': ['1.375rem', { lineHeight: '2rem', fontWeight: '700' }],
      },
      boxShadow: {
        'chunky': '0 6px 0 rgba(0,0,0,0.25)',
        'chunky-hover': '0 2px 0 rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
