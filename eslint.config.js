import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import noSecretsPlugin from 'eslint-plugin-no-secrets';
import prettierConfig from 'eslint-config-prettier';

/*
 * WARNING: These ESLint rules have been carefully configured and should NOT be changed.
 * Any modifications could negatively affect code quality and functionality.
 */

export default [
  { ignores: ['dist/**', 'node_modules/**'] },

  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript and React/Preact configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // Preact globals
        h: 'readonly',
        // Browser globals for web application
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        // Web APIs
        fetch: 'readonly',
        AbortController: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Geolocation API
        navigator: 'readonly',
        GeolocationPosition: 'readonly',
        GeolocationPositionError: 'readonly',
        // DOM types
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLDivElement: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        // Node.js globals for server-side code
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      'no-secrets': noSecretsPlugin,
    },
    rules: {
      // TypeScript recommended rules
      ...tsPlugin.configs.recommended.rules,

      // Import plugin rules
      ...importPlugin.configs.recommended.rules,

      // Custom rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^h$|^_|^err$',
        argsIgnorePattern: '^_'
      }],
      'no-console': 'off',
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        pathGroups: [
          {
            pattern: 'preact',
            group: 'external',
            position: 'before',
          },
          {
            pattern: 'preact/**',
            group: 'external',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
      }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'no-secrets/no-secrets': 'error',

      // Allow process.env for environment variables (dotenv-webpack usage)
      'no-process-env': 'off',

      // Additional useful rules
      'array-callback-return': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-destructuring': ['error', { object: true, array: false }],
      'prefer-template': 'error',
      'template-curly-spacing': 'error',

      // Security and best practices
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-shadow-restricted-names': 'error',

      // Prevent variables named exactly "date" or "Date"
      '@typescript-eslint/no-shadow': ['error', {
        ignoreOnInitialization: true,
        builtinGlobals: false, // Don't restrict built-in globals like Date here
        allow: ['Date', 'today', 'error', 'window', 'escape', 'h'] // Allow these common names
      }],
      '@typescript-eslint/no-redeclare': 'error',

      // Note: no-shadow rule with builtinGlobals: false prevents variables named exactly "date"/"Date"

      // JSX/Preact specific rules
      'jsx-quotes': ['error', 'prefer-double'], // Preact convention

      /*
       * Note: Do not use eslint-plugin-preact as it is outdated.
       * Instead, we use eslint-config-preact as an alternative.
       */
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
      },
      'import/extensions': ['.ts', '.tsx'],
      'import/external-module-folders': ['node_modules'],
    },
  },

  // Configuration files (Node.js environment)
  {
    files: ['*.config.js', '*.config.cjs', 'webpack.config.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'writable',
        require: 'writable',
        exports: 'writable',
        global: 'readonly',
        Buffer: 'readonly',
      }
    },
    rules: {
      'no-console': 'off', // Allow console in build tools
      '@typescript-eslint/no-var-requires': 'off',
      'no-useless-escape': 'off', // Allow necessary regex escapes in config files
    }
  },

  // Server-side TypeScript files
  {
    files: ['src/**/*.ts', '!src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off', // Server functions don't need explicit return types
    }
  },


  // Test files (Jest environment)
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**'],
    languageOptions: {
      globals: {
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        beforeAll: 'readonly',
        afterEach: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      }
    },
    rules: {
      'no-console': 'off', // Allow console in tests
      '@typescript-eslint/no-explicit-any': 'off', // Tests often need any types
      'no-magic-numbers': 'off', // Tests often use magic numbers
    }
  },

  // JavaScript files (Node.js environment)
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      }
    },
    rules: {
      'no-console': 'off', // Allow console in JavaScript files
    }
  },

  // Prettier configuration (must be last to override formatting rules)
  prettierConfig,
];