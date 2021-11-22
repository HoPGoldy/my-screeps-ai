module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    rules: {
        "@typescript-eslint/no-explicit-any": "off",
        'import/extensions': 'off',
        'no-use-before-define': 'off',
        'import/prefer-default-export': 'off',
        "@typescript-eslint/no-empty-function": "off"
    },
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js', '.ts'],
                moduleDirectory: ['node_modules', './src'],
            },
        },
    },
    parserOptions: {
        project: './tsconfig.json',
    },
}