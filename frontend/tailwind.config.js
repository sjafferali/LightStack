/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Semantic colours resolve to the CSS variables in index.css, so the whole
      // app repaints when data-mode changes on <html>.
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        panel2: 'var(--panel2)',
        line: 'var(--line)',
        line2: 'var(--line2)',
        tx: 'var(--tx)',
        tx2: 'var(--tx2)',
        tx3: 'var(--tx3)',
        accent: 'var(--accent)',
        p1: 'var(--p1)',
        p2: 'var(--p2)',
        p3: 'var(--p3)',
        p4: 'var(--p4)',
        p5: 'var(--p5)',
      },
      boxShadow: {
        modal: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
}
