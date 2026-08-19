/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        sunken: 'var(--surface-sunken)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        line: 'var(--line)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        frontier: 'var(--state-frontier)',
        'frontier-fill': 'var(--state-frontier-fill)',
        current: 'var(--state-current)',
        'current-fill': 'var(--state-current-fill)',
        done: 'var(--state-done)',
        'done-fill': 'var(--state-done-fill)',
      },
      fontFamily: {
        display: ['"Secular One"', 'system-ui', 'sans-serif'],
        body: ['Assistant', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: 'var(--radius)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
};
