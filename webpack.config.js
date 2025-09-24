import HtmlWebpackPlugin from 'html-webpack-plugin';
import Dotenv from 'dotenv-webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import path from 'path';
import process from 'process';
import webpack from 'webpack';

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: './.env' });

// Build configuration:
// - Source: TypeScript with ES2022 features
// - Target: ES8 (ES2017) for modern browser compatibility

export default (env, argv) => {
  // Determine mode based on argv.mode or default to development
  const mode = argv.mode || 'development';
  const isProduction = mode === 'production';

  return {
    mode: mode,
    entry: './src/index.tsx',
    output: {
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      path: path.resolve(process.cwd(), 'dist/client')
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        // Alias React to Preact for compatibility
        react: 'preact/compat',
        'react-dom': 'preact/compat'
      },
      // Add mainFields to prioritize TypeScript-compatible fields
      mainFields: ['browser', 'module', 'main'],
      // For browser builds, fallback Node.js built-ins to empty modules or alternatives
      fallback: {
        "v8": false,        // Disable v8 for browser builds
        "perf_hooks": false, // Disable perf_hooks for browser builds
        "fs": false,        // Disable fs for browser builds
        "path": false,      // Disable path for browser builds
        "os": false,        // Disable os for browser builds
        "crypto": false,    // Disable crypto for browser builds
      }
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true
            }
          }
        },
        {
           test: /\.css$/,
           use: isProduction
             ? [MiniCssExtractPlugin.loader, 'css-loader']
             : ['style-loader', 'css-loader']
         }
      ]
    },
    plugins: [
        new HtmlWebpackPlugin({
          template: './src/index.html'
        }),
        new Dotenv({
          path: './.env',
          safe: false, // Don't require all variables to be present
          systemvars: true
        }),
        // Make environment variables available in the frontend
        new webpack.DefinePlugin({
          'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL),
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
        }),
        ...(isProduction ? [
          new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css'
          })
        ] : [])
      ],
    devServer: {
      static: './dist/client',
      hot: true,
      port: parseInt(process.env.FRONTEND_PORT || '3000'),
      open: true,
      historyApiFallback: true
    },
    externals: isProduction ? {
      // Only use externals for production server builds, not for browser builds
      'v8': 'commonjs v8',
      'perf_hooks': 'commonjs perf_hooks',
      'events': 'commonjs events',
      'fs': 'commonjs fs',
      'path': 'commonjs path',
      'os': 'commonjs os',
      'crypto': 'commonjs crypto',
      'child_process': 'commonjs child_process',
      'cluster': 'commonjs cluster',
      'dgram': 'commonjs dgram',
      'dns': 'commonjs dns',
      'http2': 'commonjs http2',
      'https': 'commonjs https',
      'module': 'commonjs module',
      'net': 'commonjs net',
      'readline': 'commonjs readline',
      'repl': 'commonjs repl',
      'stream': 'commonjs stream',
      'string_decoder': 'commonjs string_decoder',
      'tls': 'commonjs tls',
      'tty': 'commonjs tty',
      'url': 'commonjs url',
      'util': 'commonjs util',
      'zlib': 'commonjs zlib'
    } : {},
    optimization: {
       splitChunks: {
         chunks: 'all',
         cacheGroups: {
           vendor: {
             test: /[\\/]node_modules[\\/]/,
             name: 'vendors',
             chunks: 'all',
           },
           styles: {
             name: 'styles',
             type: 'css/mini-extract',
             chunks: 'all',
             enforce: true,
           },
         },
       },
       ...(isProduction ? {
         minimize: true,
         minimizer: [
           new TerserPlugin({
             terserOptions: {
               compress: {
                 drop_console: true,
               },
             },
           }),
           new CssMinimizerPlugin(),
         ],
       } : {}),
     },
     devtool: isProduction ? 'source-map' : 'eval-source-map',
  };
};
