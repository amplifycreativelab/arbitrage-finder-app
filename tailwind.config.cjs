/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        'ot-background': 'var(--ot-background)',
        'ot-surface': 'var(--ot-surface)',
        'ot-surface-elevated': 'var(--ot-surface-elevated)',
        'ot-surface-hover': 'var(--ot-surface-hover)',
        
        // Borders
        'ot-border': 'var(--ot-border)',
        'ot-border-subtle': 'var(--ot-border-subtle)',
        'ot-border-strong': 'var(--ot-border-strong)',
        
        // Text colors
        'ot-foreground': 'var(--ot-foreground)',
        'ot-foreground-secondary': 'var(--ot-foreground-secondary)',
        'ot-muted': 'var(--ot-muted)',
        'ot-muted-subtle': 'var(--ot-muted-subtle)',
        
        // Accent
        'ot-accent': 'var(--ot-accent)',
        'ot-accent-hover': 'var(--ot-accent-hover)',
        'ot-accent-subtle': 'var(--ot-accent-subtle)',
        'ot-accent-glow': 'var(--ot-accent-glow)',
        
        // Semantic colors
        'ot-success': 'var(--ot-success)',
        'ot-success-dim': 'var(--ot-success-dim)',
        'ot-success-glow': 'var(--ot-success-glow)',
        'ot-warning': 'var(--ot-warning)',
        'ot-warning-dim': 'var(--ot-warning-dim)',
        'ot-error': 'var(--ot-error)',
        'ot-error-dim': 'var(--ot-error-dim)',
        'ot-info': 'var(--ot-info)',
        'ot-info-dim': 'var(--ot-info-dim)',
        
        // Special accents
        'ot-cross-provider': 'var(--ot-cross-provider)',
        'ot-cross-provider-dim': 'var(--ot-cross-provider-dim)',
        'ot-deep-scan': 'var(--ot-deep-scan)',
        'ot-deep-scan-dim': 'var(--ot-deep-scan-dim)',
        'ot-merged': 'var(--ot-merged)',
        'ot-merged-dim': 'var(--ot-merged-dim)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      borderRadius: {
        'ot-sm': 'var(--ot-radius-sm)',
        'ot': 'var(--ot-radius)',
        'ot-md': 'var(--ot-radius-md)',
        'ot-lg': 'var(--ot-radius-lg)',
        'ot-xl': 'var(--ot-radius-xl)',
      },
      boxShadow: {
        'ot-sm': 'var(--ot-shadow-sm)',
        'ot': 'var(--ot-shadow)',
        'ot-md': 'var(--ot-shadow-md)',
        'ot-lg': 'var(--ot-shadow-lg)',
        'ot-glow': 'var(--ot-shadow-glow)',
      },
      transitionDuration: {
        'ot-fast': 'var(--ot-transition-fast)',
        'ot': 'var(--ot-transition-base)',
        'ot-slow': 'var(--ot-transition-slow)',
      },
      animation: {
        'soft-pulse': 'soft-pulse 2s ease-in-out infinite',
        'pulse-live': 'pulse-live 2s ease-in-out infinite',
        'slide-in': 'slide-in 250ms ease-out',
        'fade-in': 'fade-in 200ms ease-out',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        'soft-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'pulse-live': {
          '0%, 100%': { 
            opacity: '1',
            transform: 'scale(1)',
          },
          '50%': { 
            opacity: '0.6',
            transform: 'scale(1.1)',
          },
        },
        'slide-in': {
          from: { 
            opacity: '0',
            transform: 'translateY(-8px)',
          },
          to: { 
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
