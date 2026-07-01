/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: '#4f6df5',
        violet: '#9b7cf6',
        canvas: '#eaf1ff',
        ink: '#0f172a',
        muted: '#64748b'
      },
      boxShadow: {
        card: '0 10px 30px rgba(54, 72, 120, .08)'
      }
    }
  },
  plugins: []
}
