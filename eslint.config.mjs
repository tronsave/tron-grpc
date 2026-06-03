import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    // Generated protobuf code and build output are not linted.
    { ignores: ['dist/**', 'node_modules/**', 'src/proto/**'] },
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
