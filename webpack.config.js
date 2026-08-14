//@ts-check

'use strict';

const path = require(`path`);
const fs = require(`fs`);
const webpack = require(`webpack`);

const npm_runner = process.env[`npm_lifecycle_script`];
const isProduction = (npm_runner && npm_runner.includes(`production`));

console.log(`Is production build: ${isProduction}`);
// @ts-ignore
const packageVer = require(`./package.json`).version;

let exclude = undefined;

if (isProduction) {
  exclude = path.resolve(__dirname, `src`, `testing`)
}

const dist = path.resolve(__dirname, `dist`);
fs.mkdirSync(dist, {recursive: true});

// We need to hack our chart.js copy and remove the hardcoded exports for our build.
const chartJsPackagePath = path.resolve(__dirname, `node_modules`, `chart.js`, `package.json`);
let chartJsPackage = JSON.parse(fs.readFileSync(chartJsPackagePath, `utf8`));
delete chartJsPackage.exports;
fs.writeFileSync(chartJsPackagePath, JSON.stringify(chartJsPackage, null, 2), `utf8`);

/**@type {import('webpack').Configuration}*/
const config = {
  target: `node`, // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

  entry: `./src/extension.ts`, // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: dist,
    filename: `extension.js`,
    libraryTarget: `commonjs2`,
    devtoolModuleFilenameTemplate: `../[resource-path]`,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        DEV: JSON.stringify(!isProduction),
        DB2I_VERSION: JSON.stringify(packageVer)
      }
    }),
  ],
  devtool: `source-map`,
  externals: {
    vscode: `commonjs vscode` // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [`.ts`, `.js`, `.svg`],
  },
  module: {
    rules: [
      {
        test: /\.umd\.(js)$/i,
        include: path.resolve(__dirname, `node_modules`, `chart.js`, `dist`, `chart.umd.js`),
        type: `asset/source`,

      },
      {
        // Inlined as raw source (not parsed as a module) so it can be dropped straight into a
        // <script type="module"> tag in the FastTable webview pages; see views/webviewToolkit.ts.
        test: /\.js$/,
        include: path.resolve(__dirname, `node_modules`, `@vscode-elements`, `elements`, `dist`, `bundled.js`),
        type: `asset/source`
      },
      {
        test: /\.(ts|tsx)$/i,
        exclude: /node_modules/,
        use: [
          {
            loader: `esbuild-loader`
          }
        ]
      },
      {
        test: /\.ts$/,
        exclude
      },
      {
        test: /\.ts$/,
        exclude: path.resolve(__dirname, `src`, `dcs.ts`)
      },
    ]
  }
};

module.exports = config;
