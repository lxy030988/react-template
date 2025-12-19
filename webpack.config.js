const { resolve } = require("path")
const merge = require("webpack-merge")
const getArgv = () => {
	const args = process.argv.slice(2)
	const result = {}
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--mode" && args[i + 1]) {
			result.mode = args[i + 1]
		} else if (args[i].startsWith("--mode=")) {
			result.mode = args[i].split("=")[1]
		}
	}
	return result
}
const argv = getArgv()
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
					{ loader: "css-loader", options: { importLoaders: 2 } },
					// 自定义 loader：转换 matrix3d 为可读的 transform 函数
					// 注意：loader 从下到上执行，所以这个要在 postcss-loader 之前
					{
						loader: resolve("loaders/transform-matrix-loader.js"),
						options: {
							precision: 4, // 数字精度
							verbose: true, // 显示转换日志
						},
					},
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
