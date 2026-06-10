import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: [
      '.agents/**',
      '.claude/**',
      '.cursor/**',
      'android/**',
      'dist/**',
      'node_modules/**',
      'spacetimedb/dist/**',
      'src/backend/spacetimedb/module_bindings/**',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        document: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        ResizeObserver: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
  },
];
