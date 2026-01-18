import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        process: 'readonly',
        global: 'readonly',
        React: 'readonly',
        JSX: 'readonly',
        // DOM types needed by TypeScript
        alert: 'readonly',
        confirm: 'readonly',
        navigator: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        WebSocket: 'readonly',
        // TypeScript DOM types
        AbortController: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        MouseEvent: 'readonly',
        MediaQueryList: 'readonly',
        MediaQueryListEvent: 'readonly',
        Node: 'readonly',
        NodeJS: 'readonly',
        RequestInit: 'readonly',
        HeadersInit: 'readonly',
        Response: 'readonly',
        Event: 'readonly',
        performance: 'readonly',
        // Node.js / Build tools
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      
      // React rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      'no-debugger': 'warn',
      'prefer-const': 'warn',
      'no-unused-vars': 'off', // Use TypeScript's version
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'playwright-report/', '*.config.js', '*.config.ts'],
  },
];
