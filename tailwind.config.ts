import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'c-bg': '#070711',
        'c-surface': '#0f1023',
        'c-card': 'rgba(255,255,255,0.04)',
        'c-border': 'rgba(255,255,255,0.08)',
        'c-cyan': '#00d4ff',
        'c-cyan-dim': 'rgba(0,212,255,0.15)',
        'c-purple': '#8b5cf6',
        'c-purple-dim': 'rgba(139,92,246,0.15)',
        'c-green': '#10b981',
        'c-green-dim': 'rgba(16,185,129,0.15)',
        'c-amber': '#f59e0b',
        'c-amber-dim': 'rgba(245,158,11,0.15)',
        'c-red': '#ef4444',
        'c-red-dim': 'rgba(239,68,68,0.15)',
        'c-text': '#e2e8f0',
        'c-muted': '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0,212,255,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(0,212,255,0.6)' },
        },
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'cyan': '0 0 24px rgba(0,212,255,0.25)',
        'purple': '0 0 24px rgba(139,92,246,0.25)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.1)',
      },
    },
  },
  plugins: [],
}

export default config
