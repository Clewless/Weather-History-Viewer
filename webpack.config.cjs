const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  const commonConfig = {
    mode: isProduction ? 'production' : 'development',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        react: 'preact/compat',
        'react-dom': 'preact/compat',
      },
    },
    module: {
      rules: [

        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                target: 'es2022',
                module: 'esnext',
              },
            },
          },
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
            },
          },
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
          ],
        },
      ],
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
  };

  const clientConfig = {
    ...commonConfig,
    target: 'web',
    entry: './src/index.tsx',
    output: {
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      path: path.resolve(process.cwd(), 'dist/client'),
      clean: true,
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/index.html',
      }),
      new Dotenv({
        path: './.env',
        safe: false,
        systemvars: true,
      }),
      new webpack.DefinePlugin({
        'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL),
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      }),
      ...(isProduction ? [new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' })] : []),
    ],
    devServer: {
      static: {
        directory: path.resolve(process.cwd(), 'public'),
      },
      hot: true,
      port: process.env.FRONTEND_PORT || 3000,
      historyApiFallback: true,
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
      },
      minimize: isProduction,
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
    },
  };

  const serverConfig = {
    ...commonConfig,
    target: 'node',
    entry: './src/server.ts',
    output: {
      filename: 'server.cjs',
      path: path.resolve(process.cwd(), 'dist'),
      clean: false, // Client config already cleans dist/client
      libraryTarget: 'commonjs',
    },

    externals: [nodeExternals()],
    plugins: [
      new Dotenv({
        path: './.env',
        safe: false,
        systemvars: true,
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL),
      }),
    ],
    node: {
      __dirname: false,
      __filename: false,
    },
  };

  return [clientConfig, serverConfig];
};