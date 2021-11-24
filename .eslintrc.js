module.exports = {
    env: {
        browser: true,
        es2021: true
    },
    extends: [
        'standard',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
    },
    plugins: [
        '@typescript-eslint'
    ],
    rules: {
        indent: ['error', 4],
        'brace-style': ['error', 'stroustrup'],
        'import/extensions': 'off',
        'no-use-before-define': 'off',
        'import/prefer-default-export': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/ban-ts-comment': 'off'
    }
}
