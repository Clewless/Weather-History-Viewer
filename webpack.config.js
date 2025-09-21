import HtmlWebpackPlugin from 'html-webpack-plugin';
import Dotenv from 'dotenv-webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import path from 'path';
import process from 'process';

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
      extensions: ['.ts', '.tsx', '.js'],
      alias: {
        // Alias React to Preact for compatibility
        react: 'preact/compat',
        'react-dom': 'preact/compat'
      }
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true
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
  };
};