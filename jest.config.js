module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.css$': 'identity-obj-proxy',
    '^react$': 'preact/compat',
    '^react-dom/test-utils$': 'preact/test-utils',
    '^react-dom$': 'preact/compat',
    '@testing-library/preact': '<rootDir>/node_modules/@testing-library/preact/dist/cjs/index.js'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: true
    }],
    '^.+\\.jsx?$': 'ts-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!preact).*/'
  ]
};