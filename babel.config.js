export default {
  presets: [
    ['@babel/preset-env', {
      targets: {
        browsers: ["last 2 versions", "not dead", "not < 2%"]
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