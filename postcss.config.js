import breakpoints from './app/breakpoints.js';

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mobile-breakpoint': breakpoints.mobile,
      },
    },
  },
}
