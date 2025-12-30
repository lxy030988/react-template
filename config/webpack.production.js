const TerserPlugin = require("terser-webpack-plugin")
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const { join, resolve } = require("path")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const CompressionPlugin = require("compression-webpack-plugin")
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin")

module.exports = {
	output: {
		path: join(__dirname, "../dist"),
		publicPath: "/",
		filename: "scripts/[name].[contenthash:5].bundle.js",
		assetModuleFilename: "images/[name].[contenthash:5][ext]",
	},
	performance: {
		maxAssetSize: 250000, // 最大资源大小250KB
		maxEntrypointSize: 250000, // 最大入口资源大小250KB
		hints: "warning", // 超出限制时只给出警告
	},
	optimization: {
		minimize: true,
		//css + js 多线程压缩 加快编译速度
		//电脑本身就比较慢 反而更慢
		minimizer: [
			new CssMinimizerPlugin({
				parallel: true,
			}),
			new TerserPlugin({
				parallel: true,
			}),
			new ImageMinimizerPlugin({
				test: /\.(jpe?g|png|gif|webp|avif)$/i,
				minimizer: {
					implementation: ImageMinimizerPlugin.sharpMinify,
					options: {
						encodeOptions: {
							jpeg: { quality: 75, progressive: true },
							png: { quality: 75, compressionLevel: 9 },
							gif: { interlaced: true },
							webp: { quality: 75 },
							avif: { quality: 50 },
						},
					},
				},
				generator: [
					{
						preset: "webp",
						implementation: ImageMinimizerPlugin.sharpGenerate,
						filename: "images/[name].[contenthash:5][ext]",
						options: {
							encodeOptions: {
								webp: { quality: 75 },
							},
						},
					},
					{
						preset: "avif",
						implementation: ImageMinimizerPlugin.sharpGenerate,
						filename: "images/[name].[contenthash:5][ext]",
						options: {
							encodeOptions: {
								avif: { quality: 50 },
							},
						},
					},
				],
			}),
		],
	},
	externals: {
		react: "React",
		"react-dom": "ReactDOM",
		"react-dom/client": "ReactDOM",
		"@remix-run/router": "RemixRouter",
		"react-router": "ReactRouter",
		"react-router-dom": "ReactRouterDOM",
	},
	plugins: [
		new HtmlWebpackPlugin({
			title: "Yideng",
			filename: "index.html",
			template: resolve(__dirname, "../src/index-prod.html"),
			favicon: "./public/favicon.ico",
		}),
		new CompressionPlugin({
			algorithm: "gzip",
			test: /\.(js|css|html|svg)$/i,
			threshold: 10240,
			minRatio: 0.8,
		}),
	],
}
