import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
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
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
            '@typescript-eslint/no-explicit-any': 'off', // Framework code needs flexible typing
            
            'no-restricted-globals': [
                'error',
                {
                    name: 'event',
                    message: 'Use local event parameter instead of global \'event\''
                }
            ],
            
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'CallExpression[callee.object.name=\'document\'][callee.property.name=\'querySelector\']',
                    message: 'Use dom.query() in controllers or this.$() in components instead of document.querySelector()'
                },
                {
                    selector: 'CallExpression[callee.object.name=\'document\'][callee.property.name=\'querySelectorAll\']',
                    message: 'Use dom.queryAll() in controllers or this.$$() in components instead of document.querySelectorAll()'
                },
                {
                    selector: 'CallExpression[callee.object.name=\'document\'][callee.property.name=\'getElementById\']',
                    message: 'Use dom.query() in controllers or this.$() in components instead of document.getElementById()'
                },
                {
                    selector: 'CallExpression[callee.object.name=\'document\'][callee.property.name=\'getElementsByClassName\']',
                    message: 'Use dom.queryAll() in controllers or this.$$() in components instead of document.getElementsByClassName()'
                },
                {
                    selector: 'CallExpression[callee.object.name=\'document\'][callee.property.name=\'getElementsByTagName\']',
                    message: 'Use dom.queryAll() in controllers or this.$$() in components instead of document.getElementsByTagName()'
                },
                {
                    selector: 'MemberExpression[object.name=\'element\'][property.name=\'innerHTML\']',
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
        files: ['src/controllers/**/*.{js,ts}', '.nativecore/core/router.{js,ts}', 'src/app.{js,ts}', 'src/utils/**/*.{js,ts}'],
        rules: {
            'no-restricted-syntax': 'off'
        }
    },
    {
        // Dev tools - need direct DOM access at framework level
        files: ['.nativecore/**/*.{js,ts}'],
        rules: {
            'no-restricted-syntax': 'off'
        }
    },
    {
        // Scripts and test files - relaxed rules
        files: ['scripts/**/*.{js,mjs}', '*.test.{js,ts}', '*.spec.{js,ts}', 'tests/**/*.{js,ts}'],
        rules: {
            'no-restricted-syntax': 'off',
            'no-console': 'off'
        }
    },
    {
        // Ignore patterns
        ignores: ['node_modules/**', 'dist/**', 'build/**', 'src/constants/*.js']
    }
);
