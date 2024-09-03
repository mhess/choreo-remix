import breakpoints from './app/breakpoints.js';

export default {
  plugins: {
    autoprefixer: {},
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mobile-breakpoint': breakpoints.mobile,
      },
    },
  },
}
