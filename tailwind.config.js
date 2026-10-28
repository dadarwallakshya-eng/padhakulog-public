/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand: ink on paper with a highlighter swipe, straight from the logo.
        paper: '#FBFAF6',
        ink: '#17181C',
        marker: '#FCE07A',
        canvas: '#FBFAF6',
        obsidian: '#0F1013',
        collegiate: '#17181C',
        verified: '#1F7A4D',
        danger: '#C2410C',
        highlighter: '#FCE07A',
        friend: '#FCE07A',
        // Warm greys so every neutral-* class sits on paper, not on cold white.
        neutral: {
          50: '#FBFAF6',
          100: '#F3F1EA',
          200: '#E6E3DA',
          300: '#D4D1C7',
          400: '#A8A69E',
          500: '#6E6D66',
          600: '#4A4C52',
          700: '#3A3C42',
          800: '#26282D',
          900: '#17181C',
          950: '#0F1013',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"DM Sans"', 'ui-sans-serif', 'sans-serif'],
        hand: ['Kalam', 'cursive'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        marker: '6px 6px 0 #FCE07A',
        'marker-sm': '4px 4px 0 #FCE07A',
      },
      keyframes: {
        rlPulse: { '0%': { transform: 'scale(.85)', opacity: '.7' }, '100%': { transform: 'scale(1.6)', opacity: '0' } },
        rlBlink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.35' } },
      },
      animation: {
        'rl-pulse': 'rlPulse 1.4s ease-out infinite',
        'rl-blink': 'rlBlink 1.6s infinite',
      },
    },
  },
  plugins: [],
};
