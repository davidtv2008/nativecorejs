import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021
            }
        },
        rules: {
            'no-console': 'off',
            'no-debugger': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'prefer-arrow-callback': 'warn',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-empty': ['error', { allowEmptyCatch: true }],

            'no-restricted-globals': [
                'error',
                {
                    name: 'event',
                    message: "Use local event parameter instead of global 'event'"
                }
            ],

            'no-restricted-syntax': [
                'error',
                {
                    selector: "CallExpression[callee.object.name='document'][callee.property.name='querySelector']",
                    message: "Use dom.query() in controllers or this.$() in components instead of document.querySelector()"
                },
                {
                    selector: "CallExpression[callee.object.name='document'][callee.property.name='querySelectorAll']",
                    message: "Use dom.queryAll() in controllers or this.$$() in components instead of document.querySelectorAll()"
                },
                {
                    selector: "CallExpression[callee.object.name='document'][callee.property.name='getElementById']",
                    message: "Use dom.query() in controllers or this.$() in components instead of document.getElementById()"
                },
                {
                    selector: "CallExpression[callee.object.name='document'][callee.property.name='getElementsByClassName']",
                    message: "Use dom.queryAll() in controllers or this.$$() in components instead of document.getElementsByClassName()"
                },
                {
                    selector: "CallExpression[callee.object.name='document'][callee.property.name='getElementsByTagName']",
                    message: "Use dom.queryAll() in controllers or this.$$() in components instead of document.getElementsByTagName()"
                },
                {
                    selector: "MemberExpression[object.name='element'][property.name='innerHTML']",
                    message: 'Avoid innerHTML for security. Use textContent or render() method instead'
                }
            ],

            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error'
        }
    },
    {
        // Controllers and router - allow document.querySelector since they're not components
        files: ['src/controllers/**/*.js', '.nativecore/core/router.js', 'src/app.js', 'src/utils/**/*.js'],
        rules: {
            'no-restricted-syntax': 'off'
        }
    },
    {
        // Dev tools - need direct DOM access at framework level
        files: ['.nativecore/**/*.js'],
        rules: {
            'no-restricted-syntax': 'off'
        }
    },
    {
        // Scripts and test files - relaxed rules
        files: ['scripts/**/*.{js,mjs}', '*.test.js', '*.spec.js', 'tests/**/*.js'],
        rules: {
            'no-restricted-syntax': 'off',
            'no-console': 'off'
        }
    },
    {
        // Ignore patterns
        ignores: ['node_modules/**', 'dist/**', 'build/**']
    }
];
