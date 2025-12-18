import { useState } from "react"
import { formatEther } from "viem"
import {
	useAccount,
	useBalance,
	useConnect,
	useDisconnect,
	useEnsAvatar,
	useEnsName,
	useSwitchChain,
} from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"
import { injected } from "wagmi/connectors"

export function WalletHeader() {
	const { address, isConnected, chain } = useAccount()
	const { connect } = useConnect()
	const { disconnect } = useDisconnect()
	const { switchChain } = useSwitchChain()
	const { data: ensName } = useEnsName({ address, chainId: mainnet.id })
	const { data: ensAvatar } = useEnsAvatar({
		name: ensName || undefined,
		chainId: mainnet.id,
	})
	const { data: balance } = useBalance({ address })
	const [showChainMenu, setShowChainMenu] = useState(false)

	const handleConnect = async () => {
		try {
			await connect({
				connector: injected(),
				chainId: sepolia.id, // 默认连接到 Sepolia 测试链
			})
		} catch (error) {
			console.error("连接失败:", error)
		}
	}

	const handleSwitchChain = (targetChainId: number) => {
		switchChain({ chainId: targetChainId })
		setShowChainMenu(false)
	}

	const getChainName = (chainId?: number) => {
		switch (chainId) {
			case sepolia.id:
				return "Sepolia"
			case mainnet.id:
				return "Mainnet"
			default:
				return "Unknown"
		}
	}

	const getChainColor = (chainId?: number) => {
		switch (chainId) {
			case sepolia.id:
				return "bg-purple-600" // 紫色
			case mainnet.id:
				return "bg-blue-500" // 蓝色
			default:
				return "bg-gray-500" // 灰色
		}
	}

	return (
		<header className="flex justify-between items-center px-8 py-4 bg-gray-50 border-b-2 border-gray-200">
			<div>
				<h1 className="text-2xl font-bold text-gray-800 m-0">红包系统</h1>
				<p className="text-sm text-gray-600 mt-1 mb-0">Red Packet</p>
			</div>

			<div className="flex items-center gap-4">
				{isConnected && address ? (
					<>
						{/* 网络切换 */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setShowChainMenu(!showChainMenu)}
								className={`px-4 py-2 ${getChainColor(chain?.id)} text-white border-none rounded-lg text-sm font-bold cursor-pointer flex items-center gap-2 hover:opacity-90 transition-opacity`}
							>
								<span className="w-2 h-2 rounded-full bg-white inline-block" />
								{getChainName(chain?.id)}
								<span className="text-xs">▼</span>
							</button>

							{showChainMenu && (
								<div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px]">
									<button
										type="button"
										onClick={() => handleSwitchChain(sepolia.id)}
										className={`w-full px-4 py-3 ${chain?.id === sepolia.id ? "bg-gray-50" : "bg-white"} border-none border-b border-gray-200 cursor-pointer text-left text-sm flex items-center gap-2 hover:bg-gray-50`}
									>
										<span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
										Sepolia
										{chain?.id === sepolia.id && (
											<span className="ml-auto">✓</span>
										)}
									</button>
									<button
										type="button"
										onClick={() => handleSwitchChain(mainnet.id)}
										className={`w-full px-4 py-3 ${chain?.id === mainnet.id ? "bg-gray-50" : "bg-white"} border-none cursor-pointer text-left text-sm rounded-b-lg flex items-center gap-2 hover:bg-gray-50`}
									>
										<span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
										Mainnet
										{chain?.id === mainnet.id && (
											<span className="ml-auto">✓</span>
										)}
									</button>
								</div>
							)}
						</div>

						{/* 账户信息 */}
						<div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-right">
							{/* ENS Name */}
							{ensName && (
								<div className="text-sm font-bold text-blue-600 mb-1 flex items-center gap-2">
									{ensAvatar && (
										<img
											src={ensAvatar}
											alt="ENS Avatar"
											className="w-5 h-5 rounded-full"
										/>
									)}
									{ensName}
								</div>
							)}

							{/* 地址 */}
							<div className="text-xs text-gray-600 mb-1">
								{address.slice(0, 6)}...{address.slice(-4)}
							</div>

							{/* 余额 */}
							{balance && (
								<div className="text-sm font-bold text-green-600 mt-1">
									{parseFloat(formatEther(balance.value)).toFixed(4)}{" "}
									{balance.symbol}
								</div>
							)}
						</div>

						{/* 断开连接按钮 */}
						<button
							type="button"
							onClick={() => disconnect()}
							className="px-4 py-2 bg-red-600 text-white border-none rounded-lg text-sm font-bold cursor-pointer hover:bg-red-700 transition-colors"
						>
							断开连接
						</button>
					</>
				) : (
					<button
						type="button"
						onClick={handleConnect}
						className="px-6 py-2 bg-blue-600 text-white border-none rounded-lg text-sm font-bold cursor-pointer hover:bg-blue-700 transition-colors"
					>
						连接 MetaMask (Sepolia)
					</button>
				)}
			</div>
		</header>
	)
}
