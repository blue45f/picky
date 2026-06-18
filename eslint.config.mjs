import js from '@eslint/js';
import ts from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';

export default ts.config(
  {
    ignores: [
      '**/dist/**',
      '**/_dist/**',
      'api/_serverless-api.js',
      '**/node_modules/**',
      '.vercel/**',
      'dist/**',
      'node_modules/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    files: ['**/*.{ts,tsx,js,mjs}'],
    plugins: {
      react: reactPlugin,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-empty': 'warn',
    },
  },
  {
    // verbatimModuleSyntax is enabled for apps/web + packages (NOT apps/api,
    // whose NestJS DI relies on runtime type imports via emitDecoratorMetadata).
    // Enforce type-only imports there so `eslint --fix` keeps them consistent.
    files: ['apps/web/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
    },
  },
);
