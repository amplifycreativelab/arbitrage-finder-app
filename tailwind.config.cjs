/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'ot-background': 'var(--ot-background)',
        'ot-surface': 'var(--ot-surface)',
        'ot-border': 'var(--ot-border)',
        'ot-foreground': 'var(--ot-foreground)',
        'ot-muted': 'var(--ot-muted)',
        'ot-accent': 'var(--ot-accent)',
        'ot-accent-foreground': 'var(--ot-accent-foreground)',
      },
      fontFamily: {
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
    },
  },
  plugins: [],
};

