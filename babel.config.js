export default {
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
    }]
  ]
};