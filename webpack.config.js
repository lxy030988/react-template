const { resolve } = require("path")
const merge = require("webpack-merge")
const argv = require("yargs-parser")(process.argv.slice(2))
const _mode = argv.mode || "development"
const _mergeConfig = require(`./config/webpack.${_mode}.js`)
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const _modeflag = _mode === "production" ? true : false
const { CleanWebpackPlugin } = require("clean-webpack-plugin")
// const ProgressBarPlugin = require('progress-bar-webpack-plugin');
// const WebpackBar = require('webpackbar');
const { ThemedProgressPlugin } = require("themed-progress-plugin")

const webpackBaseConfig = {
	entry: {
		main: resolve("src/index.tsx"),
	},
	module: {
		rules: [
			{
				test: /\.(ts|tsx)$/,
				exclude: /(node_modules)/,
				use: {
					// `.swcrc` can be used to configure swc
					loader: "swc-loader",
				},
			},
			{
				test: /\.(png|jpg|jpeg|gif|svg)$/i,
				type: "asset",
				parser: {
					dataUrlCondition: {
						maxSize: 8 * 1024, // 8kb 以下内联
					},
				},
			},
			{
				test: /\.css$/i,
				use: [
					MiniCssExtractPlugin.loader,
					// 'style-loader',
					{ loader: "css-loader", options: { importLoaders: 1 } },
					"postcss-loader",
				],
			},
		],
	},
	resolve: {
		alias: {
			"@": resolve("src/"),
			"@react-native-async-storage/async-storage": resolve(
				"src/empty-async-storage.ts",
			),
		},
		extensions: [".js", ".ts", ".tsx", ".jsx", ".css"],
		fallback: {
			// stream: require.resolve('stream-browserify'),
		},
	},
	plugins: [
		new CleanWebpackPlugin(),
		new MiniCssExtractPlugin({
			filename: _modeflag
				? "styles/[name].[contenthash:5].css"
				: "styles/[name].css",
			chunkFilename: _modeflag
				? "styles/[name].[contenthash:5].css"
				: "styles/[name].css",
			ignoreOrder: false,
		}),
		new ThemedProgressPlugin(),
	],
}

module.exports = merge.default(webpackBaseConfig, _mergeConfig)
