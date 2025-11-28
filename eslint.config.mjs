import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["target","*.config.js",".buildkite"]
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/ban-types': 'off'
    },
    "languageOptions": {
      "globals": {
        ...globals.node
      }
    }
  },
];
