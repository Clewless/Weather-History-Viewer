/* eslint-disable no-undef */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.css$': 'identity-obj-proxy',
    '^react$': 'preact/compat',
    '^react-dom/test-utils$': 'preact/test-utils',
    '^react-dom$': 'preact/compat',
    '^react/jsx-runtime$': 'preact/jsx-runtime',
    '^@testing-library/preact$': '<rootDir>/node_modules/@testing-library/preact/dist/cjs/index.js'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        module: 'esnext',
        jsxImportSource: 'preact'
      }
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!preact/).*'
  ],
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  }
};