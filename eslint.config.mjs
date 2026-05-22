import expoConfig from 'eslint-config-expo/flat.js';

export default [
  ...expoConfig,
  {
    ignores: [
      'docs/design/v1/raw/**',
      'docs/design/v1/screenshots/**',
      'node_modules/**',
      'coverage/**',
      '.expo/**',
    ],
  },
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'Use src/lib/supabase wrappers; feature and route code must not import the raw client.',
            },
          ],
        },
      ],
    },
  },
];
