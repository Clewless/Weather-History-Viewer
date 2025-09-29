module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        browsers: ["Chrome >= 65", "Firefox >= 60", "Safari >= 12", "Edge >= 79", "not dead", "not < 2%"]
      }
    }],
    '@babel/preset-typescript',
    ['@babel/preset-react', { 
      runtime: 'automatic',
      importSource: 'preact'
    }]
  ],
  plugins: [
    ['@babel/plugin-transform-runtime', {
      regenerator: true
    }],
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '^([^.]+).js$': '\\1',
          '^([^.]+).jsx$': '\\1',
          '^([^.]+).ts$': '\\1',
          '^([^.]+).tsx$': '\\1'
        }
      }
    ]
  ]
};