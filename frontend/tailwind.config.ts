import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101418',
        mist: '#eef4ef',
        zoo: {
          leaf: '#6f8f4e',
          bark: '#7b4f2d',
          sun: '#f3c86d'
        }
      },
      boxShadow: {
        soft: '0 16px 40px rgba(16, 20, 24, 0.08)'
      }
    }
  },
  plugins: []
} satisfies Config;
