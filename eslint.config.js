import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'test-results', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['src/sim/**/*.ts'],
    rules: {
      // Simulation must be deterministic and renderer-free.
      'no-restricted-globals': ['error', { name: 'performance', message: 'Use sim tick time.' }],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded Rng from sim/core/rng.' },
        { object: 'Date', property: 'now', message: 'Use sim tick time.' },
      ],
      'no-restricted-imports': ['error', { patterns: ['phaser', '**/render/**', '**/ui/**'] }],
    },
  },
);
