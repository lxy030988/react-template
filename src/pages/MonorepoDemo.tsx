import { Button } from "@monorepo-base/components"
import {
	useFormattedDate,
	useLocalStorage,
	useToggle,
} from "@monorepo-base/hooks"

export default function MonorepoPackagesDemo() {
	// 使用 useToggle hook
	const [isVisible, toggleVisible] = useToggle(true)

	// 使用 useLocalStorage hook
	const [name, setName] = useLocalStorage("demo-name", "Guest")
	const [count, setCount] = useLocalStorage("demo-count", 0)

	// 使用 useFormattedDate hook (内部使用了 utils 的 formatDate)
	const currentDate = new Date()
	const formattedDate = useFormattedDate(currentDate)

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-4xl font-bold text-gray-900 mb-8">
					Monorepo Packages Demo
				</h1>

				{/* useToggle Demo */}
				<div className="bg-white rounded-lg shadow-md p-6 mb-6">
					<h2 className="text-2xl font-semibold text-gray-800 mb-4">
						📦 useToggle Hook
					</h2>
					<Button
						variant="primary"
						label={isVisible ? "Hide Content" : "Show Content"}
						onClick={toggleVisible}
					/>
					{isVisible && (
						<div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
							<p className="text-gray-700">
								✨ This content is controlled by useToggle hook!
							</p>
						</div>
					)}
				</div>

				{/* useLocalStorage Demo */}
				<div className="bg-white rounded-lg shadow-md p-6 mb-6">
					<h2 className="text-2xl font-semibold text-gray-800 mb-4">
						💾 useLocalStorage Hook
					</h2>
					<div className="space-y-4">
						<div>
							<span className="block text-sm font-medium text-gray-700 mb-2">
								Your Name (saved to localStorage)
							</span>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="Enter your name"
							/>
						</div>
						<div>
							<span className="block text-sm font-medium text-gray-700 mb-2">
								Counter (persisted in localStorage)
							</span>
							<div className="flex items-center gap-4">
								<Button
									variant="danger"
									size="sm"
									label="-"
									onClick={() => setCount(count - 1)}
								/>
								<span className="text-2xl font-bold text-gray-800 min-w-[60px] text-center">
									{count}
								</span>
								<Button
									variant="primary"
									size="sm"
									label="+"
									onClick={() => setCount(count + 1)}
								/>
							</div>
						</div>
						<p className="text-sm text-gray-600 mt-4">
							💡 Tip: Refresh the page - your data will persist!
						</p>
					</div>
				</div>

				{/* useFormattedDate Demo - 测试 hooks 内部使用 utils */}
				<div className="bg-white rounded-lg shadow-md p-6 mb-6">
					<h2 className="text-2xl font-semibold text-gray-800 mb-4">
						📅 useFormattedDate Hook
					</h2>
					<div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
						<p className="text-sm text-yellow-800 mb-2">
							🔗 <strong>包依赖测试:</strong> 这个 hook 内部使用了
							@monorepo-base/utils 的 formatDate 函数
						</p>
						<p className="text-gray-700">
							<span className="font-semibold">当前时间:</span>{" "}
							<span className="text-blue-600 font-mono">{formattedDate}</span>
						</p>
						<p className="text-xs text-gray-500 mt-2">
							如果能正确显示时间,说明 hooks → utils 的依赖关系正常工作!
						</p>
					</div>
				</div>

				{/* Button Component Demo */}
				<div className="bg-white rounded-lg shadow-md p-6 mb-6">
					<h2 className="text-2xl font-semibold text-gray-800 mb-4">
						🎨 Button Component (Tailwind CSS)
					</h2>
					<div className="space-y-4">
						<div>
							<h3 className="text-sm font-medium text-gray-700 mb-2">
								Variants
							</h3>
							<div className="flex flex-wrap gap-3">
								<Button variant="primary" label="Primary" />
								<Button variant="secondary" label="Secondary" />
								<Button variant="outline" label="Outline" />
								<Button variant="ghost" label="Ghost" />
								<Button variant="danger" label="Danger" />
							</div>
						</div>
						<div>
							<h3 className="text-sm font-medium text-gray-700 mb-2">Sizes</h3>
							<div className="flex flex-wrap items-center gap-3">
								<Button variant="primary" size="sm" label="Small" />
								<Button variant="primary" size="md" label="Medium" />
								<Button variant="primary" size="lg" label="Large" />
							</div>
						</div>
						<div>
							<h3 className="text-sm font-medium text-gray-700 mb-2">States</h3>
							<div className="flex flex-wrap gap-3">
								<Button variant="primary" label="Normal" />
								<Button variant="primary" label="Disabled" disabled />
							</div>
						</div>
					</div>
				</div>

				{/* Package Info */}
				<div className="mt-8 p-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg text-white">
					<h3 className="text-xl font-bold mb-3">📦 Installed Packages</h3>
					<div className="space-y-2">
						<div className="flex items-start gap-2">
							<span className="text-green-300">✅</span>
							<div>
								<p className="font-semibold">@monorepo-base/hooks@0.2.0</p>
								<p className="text-sm opacity-90">React hooks collection</p>
							</div>
						</div>
						<div className="flex items-start gap-2">
							<span className="text-green-300">✅</span>
							<div>
								<p className="font-semibold">@monorepo-base/components@0.1.0</p>
								<p className="text-sm opacity-90">
									React components with Tailwind CSS
								</p>
							</div>
						</div>
						<div className="flex items-start gap-2">
							<span className="text-blue-300">🔗</span>
							<div>
								<p className="font-semibold">
									@monorepo-base/utils (peer dependency)
								</p>
								<p className="text-sm opacity-90">
									Automatically installed as hooks dependency
								</p>
							</div>
						</div>
					</div>
					<p className="mt-4 text-sm opacity-90 border-t border-white/20 pt-4">
						📡 Installed from Verdaccio local registry (http://localhost:4873)
					</p>
				</div>
			</div>
		</div>
	)
}
