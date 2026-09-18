/** @type {import('tailwindcss').Config} */

/**
 * Design tokens for the "doppler console" aesthetic.
 * Everything the UI renders resolves back to one of these names so a palette
 * change is a one-file change. Values are duplicated in src/core/theme/tokens.ts
 * for the handful of places that need a raw colour (map styling, status bar,
 * native components that do not accept className).
 */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#05070B',
          800: '#080B10',
          700: '#11161F',
          600: '#1A212C',
          500: '#27303D',
          400: '#3A4553',
        },
        bone: {
          50: '#FBF9F4',
          100: '#F2EEE4',
          200: '#E2DCCC',
          300: '#C4BCA8',
        },
        lightning: '#F5C242',
        supercell: '#FF5A47',
        radar: '#4FD1C5',
        funnel: '#8E7CFF',
      },
      fontFamily: {
        sans: ['InstrumentSans_400Regular'],
        medium: ['InstrumentSans_500Medium'],
        semibold: ['InstrumentSans_600SemiBold'],
        bold: ['InstrumentSans_700Bold'],
        mono: ['IBMPlexMono_400Regular'],
        monoMedium: ['IBMPlexMono_500Medium'],
        monoBold: ['IBMPlexMono_600SemiBold'],
      },
      borderRadius: {
        panel: '18px',
      },
    },
  },
  plugins: [],
};
