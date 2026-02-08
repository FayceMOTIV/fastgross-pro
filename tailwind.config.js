/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // New light theme palette
        surface: {
          DEFAULT: '#FFFFFF',
          hover: '#F4F6FB',
          muted: '#FAFBFE',
        },
        text: {
          DEFAULT: '#1A1F36',
          secondary: '#5E6687',
          muted: '#8F95B2',
        },
        accent: {
          DEFAULT: '#4F6EF7',
          light: '#818CF8',
          glow: 'rgba(79,110,247,0.12)',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#4F6EF7',
          600: '#4338CA',
          700: '#3730A3',
        },
        success: {
          DEFAULT: '#34D399',
          light: '#D1FAE5',
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#FBBF24',
          light: '#FEF3C7',
          dark: '#D97706',
        },
        danger: {
          DEFAULT: '#F87171',
          light: '#FEE2E2',
          dark: '#DC2626',
        },
        // Legacy brand colors (for compatibility)
        brand: {
          50: '#eefff8',
          100: '#d6fff0',
          200: '#b0fde1',
          300: '#73f7cb',
          400: '#2fe8ad',
          500: '#00d49a',
          600: '#00a87a',
          700: '#008764',
          800: '#046a51',
          900: '#065743',
          950: '#003124',
        },
        // Legacy dark colors (for compatibility during transition)
        dark: {
          50: '#f6f6f9',
          100: '#ededf1',
          200: '#d7d7e0',
          300: '#b4b4c5',
          400: '#8b8ba5',
          500: '#6d6d8a',
          600: '#575772',
          700: '#47475d',
          800: '#3d3d4f',
          900: '#1a1a2e',
          950: '#0d0d1a',
        },
      },
      fontFamily: {
        display: ['"Outfit"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', '"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'soft-sm': '0 1px 3px rgba(26,31,54,0.04)',
        'soft-md': '0 4px 16px rgba(26,31,54,0.06)',
        'soft-lg': '0 12px 40px rgba(26,31,54,0.08)',
        'soft-xl': '0 20px 60px rgba(26,31,54,0.10)',
        'accent-glow': '0 8px 32px rgba(79,110,247,0.15)',
        'card-hover': '0 8px 30px rgba(26,31,54,0.08)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      backgroundImage: {
        'gradient-hero':
          'linear-gradient(135deg, #E8EDFF 0%, #F0E6FF 30%, #FFE8F0 60%, #FFF3E0 100%)',
        'gradient-accent': 'linear-gradient(135deg, #4F6EF7 0%, #818CF8 50%, #A78BFA 100%)',
        'gradient-warm': 'linear-gradient(135deg, #F97066 0%, #FB923C 100%)',
        'gradient-ocean': 'linear-gradient(135deg, #38BDF8 0%, #818CF8 100%)',
        'gradient-mint': 'linear-gradient(135deg, #34D399 0%, #38BDF8 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #F472B6 0%, #FB923C 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-up-delayed': 'slideUp 0.5s ease-out 0.2s both',
        'pulse-glow': 'pulseGlow 2s infinite',
        float: 'float 8s ease-in-out infinite',
        'float-delayed': 'float 8s ease-in-out 2s infinite',
        'float-slow': 'float 12s ease-in-out infinite',
        levitate: 'levitate 6s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(79, 110, 247, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(79, 110, 247, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.02)' },
        },
        levitate: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
