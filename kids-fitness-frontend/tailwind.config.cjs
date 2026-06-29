/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Lexend', 'sans-serif']
      },
      colors: {
        sand: '#f8f9fa',
        ink: '#000000',
        coral: '#29AAE2',
        ocean: '#0056b3',
        moss: '#28a745',
        night: '#000000',
        brand: {
          blue: '#29AAE2',
          black: '#000000',
          yellow: '#ffcd00',
          light: '#f8f9fa'
        }
      },
      boxShadow: {
        glow: '0 20px 60px -30px rgba(20,19,24,0.45)'
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' }
        },
        rise: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        'scale-up': {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' }
        }
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        rise: 'rise 0.6s ease-out both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'scale-up': 'scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both'
      }
    }
  },
  plugins: []
};
