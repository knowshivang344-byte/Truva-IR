/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'truva-canvas':  '#050811',
        'truva-surface': '#0b1120',
        'truva-elevated':'#131a31',
        'truva-accent':  '#0066FF',
        'truva-cyan':    '#00F2FE',
        'truva-confirm': '#00E676',
        'truva-warn':    '#FFC107',
        'truva-crit':    '#FF1744',
      },
      backdropBlur: { 'glass': '16px', 'glass-lg': '24px', 'glass-xl': '40px' },
      backgroundImage: {
        'cinematic-mesh': 'radial-gradient(at 40% 20%, rgba(0, 102, 255, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(0, 242, 254, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(0, 102, 255, 0.1) 0px, transparent 50%)',
        'cinematic-crit': 'radial-gradient(at 50% 50%, rgba(255, 23, 68, 0.2) 0px, transparent 70%)',
      },
      animation: {
        'pulse-accent': 'pulse-accent 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'scan-line':    'scan-line 4s linear infinite',
        'confidence-ring': 'confidence-ring 0.8s ease-out forwards',
        'mesh-spin':    'mesh-spin 30s linear infinite',
        'float':        'float 6s ease-in-out infinite',
        'glow-pulse':   'glow-pulse 3s ease-in-out infinite',
        'heartbeat':    'heartbeat 1.5s ease-in-out infinite',
        'shudder':      'shudder 0.3s ease-in-out',
      },
      keyframes: {
        'pulse-accent': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: .3 },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'mesh-spin': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.1)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        'glow-pulse': {
          '0%, 100%': { filter: 'drop-shadow(0 0 15px rgba(0,242,254,0.3))' },
          '50%': { filter: 'drop-shadow(0 0 35px rgba(0,242,254,0.7))' },
        },
        'heartbeat': {
          '0%, 100%': { transform: 'scale(1)' },
          '15%': { transform: 'scale(1.3)' },
          '30%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.3)' },
          '60%': { transform: 'scale(1)' },
        },
        'shudder': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '20%': { transform: 'translate(-5px, 3px)' },
          '40%': { transform: 'translate(4px, -4px)' },
          '60%': { transform: 'translate(-3px, 5px)' },
          '80%': { transform: 'translate(5px, -2px)' },
        }
      }
    },
  },
  plugins: [],
}
