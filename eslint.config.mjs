import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    // Build output is not linted.
    { ignores: ['dist/**', 'node_modules/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            // TypeScript already resolves identifiers; `no-undef` only causes
            // false positives for globals like `fetch` / `Buffer` / `process`.
            'no-undef': 'off',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    }
);
