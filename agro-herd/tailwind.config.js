/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#2E7D32',
          'primary-light': '#4CAF50',
          'primary-dark': '#1B5E20',
          secondary: '#1565C0',
          'secondary-light': '#1E88E5',
          accent: '#F9A825',
          'accent-light': '#FDD835',
        },
        success: '#43A047',
        warning: '#FB8C00',
        danger: '#E53935',
        info: '#039BE5',
        farm: {
          bg: '#F8FAF8',
          card: '#FFFFFF',
          sidebar: '#1B3A2D',
          'sidebar-hover': '#254A39',
          'sidebar-active': '#2E5C45',
          'text-primary': '#1C2321',
          'text-secondary': '#5A6A5F',
          border: '#E0E8E2',
        },
      },
      fontFamily: {
        heading: ['Sora', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
      },
      maxWidth: {
        'content': '1400px',
      },
      width: {
        'sidebar': '260px',
        'sidebar-collapsed': '72px',
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card': '0 2px 8px rgba(0,0,0,0.06)',
        'elevated': '0 4px 16px rgba(0,0,0,0.08)',
        'modal': '0 8px 32px rgba(0,0,0,0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
