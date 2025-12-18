import { useCallback, useEffect, useState } from "react"
import { formatEther, parseEther } from "viem"
import {
	useAccount,
	usePublicClient,
	useReadContract,
	useWaitForTransactionReceipt,
	useWatchContractEvent,
	useWriteContract,
} from "wagmi"
import { RED_PACKET_ABI, RED_PACKET_ADDRESS } from "@/contracts/RedPacket"

// 事件参数类型
interface PacketCreatedArgs {
	packetId: bigint
	totalAmount: bigint
}

interface PacketClaimedArgs {
	packetId: bigint
	claimer: string
	amount: bigint
	timestamp?: bigint
}

interface PacketFinishedArgs {
	packetId: bigint
}

interface AlreadyClaimedArgs {
	packetId: bigint
}

// 领取记录接口
interface ClaimRecord {
	claimer: string
	amount: bigint
	timestamp: bigint
}

export function RedPacketSystem() {
	const { address, isConnected } = useAccount()
	const publicClient = usePublicClient()
	const [amount, setAmount] = useState("")
	const [count, setCount] = useState("")
	const [isRandom, setIsRandom] = useState(true)
	const [packetId, setPacketId] = useState("")
	const [notifications, setNotifications] = useState<
		{ id: string; message: string }[]
	>([])
	const [claimRecords, setClaimRecords] = useState<Map<string, ClaimRecord[]>>(
		new Map(),
	)
	const [loadedPackets, setLoadedPackets] = useState<Set<string>>(new Set())

	const { data: hash, writeContract, isPending } = useWriteContract()
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
		hash,
	})

	// 读取红包总数
	const { data: totalPackets, refetch: refetchTotal } = useReadContract({
		address: RED_PACKET_ADDRESS as `0x${string}`,
		abi: RED_PACKET_ABI,
		functionName: "getTotalPackets",
	})

	// 读取用户创建的红包
	const { data: myPackets, refetch: refetchMyPackets } = useReadContract({
		address: RED_PACKET_ADDRESS as `0x${string}`,
		abi: RED_PACKET_ABI,
		functionName: "getCreatorPackets",
		args: address ? [address] : undefined,
	})

	// 读取用户领取的红包
	const { data: claimedPackets, refetch: refetchClaimedPackets } =
		useReadContract({
			address: RED_PACKET_ADDRESS as `0x${string}`,
			abi: RED_PACKET_ABI,
			functionName: "getUserClaimedPackets",
			args: address ? [address] : undefined,
		})

	// 检查当前用户是否已领取指定红包
	const { data: hasClaimedCurrent, refetch: refetchHasClaimed } =
		useReadContract({
			address: RED_PACKET_ADDRESS as `0x${string}`,
			abi: RED_PACKET_ABI,
			functionName: "hasClaimed",
			args: packetId && address ? [BigInt(packetId), address] : undefined,
		})

	// 监听红包创建事件
	useWatchContractEvent({
		address: RED_PACKET_ADDRESS as `0x${string}`,
		abi: RED_PACKET_ABI,
		eventName: "PacketCreated",
		onLogs(logs) {
			for (const log of logs) {
				const args = log.args as unknown as PacketCreatedArgs
				addNotification(
					`🎉 新红包创建！ID: ${args.packetId}, 金额: ${formatEther(args.totalAmount)} ETH`,
				)
			}
		},
	})

	// 监听红包领取事件
	useWatchContractEvent({
		address: RED_PACKET_ADDRESS as `0x${string}`,
		abi: RED_PACKET_ABI,
		eventName: "PacketClaimed",
		onLogs(logs) {
			for (const log of logs) {
				const args = log.args as unknown as PacketClaimedArgs
				const packetIdStr = args.packetId.toString()
				addNotification(
					`💰 红包被领取！ID: ${args.packetId}, 领取人: ${args.claimer.slice(0, 6)}...${args.claimer.slice(-4)}, 金额: ${formatEther(args.amount)} ETH`,
				)

				// 添加到领取记录
				const record: ClaimRecord = {
					claimer: args.claimer,
					amount: args.amount,
					timestamp: args.timestamp || BigInt(Math.floor(Date.now() / 1000)),
				}

				setClaimRecords((prev) => {
					const newMap = new Map(prev)
					const existing = newMap.get(packetIdStr) || []
					newMap.set(packetIdStr, [...existing, record])
					return newMap
				})
			}
		},
	})

	// 监听红包抢完事件
	useWatchContractEvent({
		address: RED_PACKET_ADDRESS as `0x${string}`,
		abi: RED_PACKET_ABI,
		eventName: "PacketFinished",
		onLogs(logs) {
			for (const log of logs) {
				const args = log.args as unknown as PacketFinishedArgs
				addNotification(`🎊 红包已抢完！ID: ${args.packetId}`)
			}
		},
	})

	// 监听已领取事件
	useWatchContractEvent({
		address: RED_PACKET_ADDRESS as `0x${string}`,
		abi: RED_PACKET_ABI,
		eventName: "AlreadyClaimed",
		onLogs(logs) {
			for (const log of logs) {
				const args = log.args as unknown as AlreadyClaimedArgs
				addNotification(`⚠️ 你已经领取过这个红包了！ID: ${args.packetId}`)
			}
		},
	})

	const addNotification = useCallback((message: string) => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
		setNotifications((prev) => [{ id, message }, ...prev].slice(0, 10))
	}, [])

	// 手动加载特定红包的历史领取记录
	const loadClaimHistory = useCallback(
		async (packetIdToLoad: bigint, showNotification = true) => {
			if (!publicClient) {
				console.log("❌ publicClient 未就绪")
				if (showNotification) addNotification("⚠️ 网络未就绪，请稍后重试")
				return
			}

			try {
				console.log(`🔍 开始加载红包 #${packetIdToLoad} 的历史记录...`)
				if (showNotification)
					addNotification(`🔍 正在加载红包 #${packetIdToLoad} 的领取记录...`)

				// 获取 PacketClaimed 事件的历史日志
				const logs = await publicClient.getLogs({
					address: RED_PACKET_ADDRESS as `0x${string}`,
					event: {
						type: "event",
						name: "PacketClaimed",
						inputs: [
							{ type: "uint256", name: "packetId", indexed: true },
							{ type: "address", name: "claimer", indexed: true },
							{ type: "uint256", name: "amount", indexed: false },
							{ type: "uint256", name: "timestamp", indexed: false },
						],
					},
					args: {
						packetId: packetIdToLoad,
					},
					fromBlock: "earliest" as unknown as bigint,
					toBlock: "latest" as unknown as bigint,
				})

				console.log(`✅ 找到 ${logs.length} 条领取记录`)

				// 处理日志并更新 claimRecords
				const records: ClaimRecord[] = logs.map((log) => {
					const args = log.args as unknown as PacketClaimedArgs
					return {
						claimer: args.claimer,
						amount: args.amount,
						timestamp: args.timestamp || BigInt(0),
					}
				})

				setClaimRecords((prev) => {
					const newMap = new Map(prev)
					newMap.set(packetIdToLoad.toString(), records)
					return newMap
				})

				// 标记为已加载
				setLoadedPackets((prev) => new Set(prev).add(packetIdToLoad.toString()))

				if (showNotification) {
					if (records.length > 0) {
						console.log(`💾 保存 ${records.length} 条记录到状态`)
						addNotification(
							`✅ 红包 #${packetIdToLoad} 加载完成: ${records.length} 条记录`,
						)
					} else {
						console.log("⚠️ 没有找到领取记录")
						addNotification(`✅ 红包 #${packetIdToLoad} 加载完成: 暂无领取记录`)
					}
				}
			} catch (error) {
				console.error("❌ 加载历史记录失败:", error)
				if (showNotification)
					addNotification(
						`❌ 加载失败: ${error instanceof Error ? error.message : "网络错误"}`,
					)
			}
		},
		[publicClient, addNotification],
	)

	// 自动加载历史记录（仅在页面首次加载或有新红包时触发一次）
	useEffect(() => {
		if (myPackets && myPackets.length > 0 && publicClient) {
			// 检查是否有未加载的红包
			const unloadedPackets = myPackets.filter((id) => {
				const idStr = id.toString()
				// 只检查 loadedPackets 标记
				return !loadedPackets.has(idStr)
			})

			if (unloadedPackets.length > 0) {
				console.log(
					`🚀 检测到 ${unloadedPackets.length} 个未加载的红包，开始加载历史记录`,
				)

				// 异步加载，不阻塞渲染，不显示通知
				const loadAll = async () => {
					for (const id of unloadedPackets) {
						await loadClaimHistory(id, false) // 自动加载不显示通知
						await new Promise((resolve) => setTimeout(resolve, 200))
					}
				}

				loadAll()
			}
		}
	}, [myPackets, publicClient, loadedPackets, loadClaimHistory])

	const handleCreatePacket = async () => {
		if (!amount || !count) {
			alert("请输入金额和数量")
			return
		}

		try {
			writeContract({
				address: RED_PACKET_ADDRESS as `0x${string}`,
				abi: RED_PACKET_ABI,
				functionName: "createPacket",
				args: [BigInt(count), isRandom],
				value: parseEther(amount),
			})
		} catch (error) {
			console.error("创建失败:", error)
			alert(`创建失败: ${(error as Error).message}`)
		}
	}

	const handleClaimPacket = async () => {
		if (!packetId) {
			alert("请输入红包ID")
			return
		}

		// 前端检查是否已领取
		if (hasClaimedCurrent) {
			const confirmClaim = window.confirm(
				"⚠️ 检测到你已经领取过这个红包了！\n\n如果继续尝试领取，交易会失败并消耗 Gas 费。\n\n是否仍要继续？",
			)
			if (!confirmClaim) {
				return
			}
		}

		try {
			writeContract({
				address: RED_PACKET_ADDRESS as `0x${string}`,
				abi: RED_PACKET_ABI,
				functionName: "claimPacket",
				args: [BigInt(packetId)],
			})
		} catch (error) {
			console.error("领取失败:", error)
			alert(`领取失败: ${(error as Error).message}`)
		}
	}

	// 交易成功后自动刷新
	useEffect(() => {
		if (isSuccess && hash) {
			// 清空表单
			setAmount("")
			setCount("")
			setPacketId("")

			// 延迟刷新，等待区块确认和事件触发
			const timer = setTimeout(async () => {
				console.log("🔄 交易成功，开始刷新所有数据...")

				// 刷新所有合约读取数据
				await Promise.all([
					refetchTotal(),
					refetchMyPackets(),
					refetchClaimedPackets(),
					refetchHasClaimed(),
				])

				console.log("✅ 数据刷新完成")
			}, 2000)

			return () => clearTimeout(timer)
		}
	}, [
		isSuccess,
		hash,
		refetchTotal,
		refetchMyPackets,
		refetchClaimedPackets,
		refetchHasClaimed,
	])

	if (!isConnected) {
		return (
			<div className="p-6 bg-white rounded-lg shadow-sm mb-6">
				<h2 className="text-xl font-bold mb-2">红包系统</h2>
				<p className="text-gray-600">请先连接钱包</p>
			</div>
		)
	}

	return (
		<div>
			<div className="p-6 bg-white rounded-lg shadow-sm mb-6">
				<div className="grid grid-cols-4 gap-4 mb-6">
					<div className="p-4 bg-gray-50 rounded text-center">
						<div className="text-xs text-gray-600 mb-2">合约地址</div>
						<div className="text-base font-bold text-gray-800">
							{`${RED_PACKET_ADDRESS.slice(0, 8)}...${RED_PACKET_ADDRESS.slice(-6)}`}
						</div>
					</div>
					<div className="p-4 bg-gray-50 rounded text-center">
						<div className="text-xs text-gray-600 mb-2">红包总数</div>
						<div className="text-base font-bold text-gray-800">
							{totalPackets?.toString() || "0"}
						</div>
					</div>
					<div className="p-4 bg-gray-50 rounded text-center">
						<div className="text-xs text-gray-600 mb-2">我创建的</div>
						<div className="text-base font-bold text-gray-800">
							{myPackets?.length || 0}
						</div>
					</div>
					<div className="p-4 bg-gray-50 rounded text-center">
						<div className="text-xs text-gray-600 mb-2">我领取的</div>
						<div className="text-base font-bold text-gray-800">
							{claimedPackets?.length || 0}
						</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-6 mb-6">
					{/* 发红包 */}
					<div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
						<h3 className="text-lg font-bold text-red-600 mb-4">发红包</h3>

						<div className="mb-4">
							<label htmlFor="amount" className="block mb-2 font-bold text-sm">
								总金额 (ETH):
							</label>
							<input
								id="amount"
								type="text"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								placeholder="0.01"
								className="w-full px-3 py-2 border border-gray-300 rounded text-base focus:outline-none focus:ring-2 focus:ring-red-500"
							/>
						</div>

						<div className="mb-4">
							<label htmlFor="count" className="block mb-2 font-bold text-sm">
								红包数量:
							</label>
							<input
								id="count"
								type="number"
								value={count}
								onChange={(e) => setCount(e.target.value)}
								placeholder="3"
								min="1"
								className="w-full px-3 py-2 border border-gray-300 rounded text-base focus:outline-none focus:ring-2 focus:ring-red-500"
							/>
						</div>

						<div className="mb-4">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={isRandom}
									onChange={(e) => setIsRandom(e.target.checked)}
									className="w-4 h-4 cursor-pointer"
								/>
								<span className="text-sm">随机红包</span>
							</label>
							<p className="text-xs text-gray-600 ml-6 mt-2">
								{isRandom ? "每个红包金额随机" : "每个红包金额平均"}
							</p>
						</div>

						<button
							type="button"
							onClick={handleCreatePacket}
							disabled={isPending || isConfirming}
							className="w-full px-6 py-3 bg-red-600 text-white border-none rounded text-base font-bold cursor-pointer disabled:opacity-50 hover:bg-red-700 transition-colors"
						>
							{isPending
								? "等待确认..."
								: isConfirming
									? "创建中..."
									: "发红包"}
						</button>
					</div>

					{/* 抢红包 */}
					<div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
						<h3 className="text-lg font-bold text-green-600 mb-4">抢红包</h3>

						<div className="mb-4">
							<label
								htmlFor="packetId"
								className="block mb-2 font-bold text-sm"
							>
								红包ID:
							</label>
							<input
								id="packetId"
								type="number"
								value={packetId}
								onChange={(e) => setPacketId(e.target.value)}
								placeholder="0"
								min="0"
								className="w-full px-3 py-2 border border-gray-300 rounded text-base focus:outline-none focus:ring-2 focus:ring-green-500"
							/>
						</div>

						{/* 显示是否已领取 */}
						{packetId && hasClaimedCurrent !== undefined && (
							<div
								className={`p-2 mb-4 rounded text-sm ${
									hasClaimedCurrent
										? "bg-yellow-50 border border-yellow-200"
										: "bg-blue-50 border border-blue-200"
								}`}
							>
								{hasClaimedCurrent ? (
									<span className="text-yellow-700">
										⚠️ 你已经领取过这个红包了
									</span>
								) : (
									<span className="text-blue-700">✓ 可以领取</span>
								)}
							</div>
						)}

						<button
							type="button"
							onClick={handleClaimPacket}
							disabled={isPending || isConfirming}
							className="w-full px-6 py-3 bg-green-600 text-white border-none rounded text-base font-bold cursor-pointer disabled:opacity-50 hover:bg-green-700 transition-colors"
						>
							{isPending
								? "等待确认..."
								: isConfirming
									? "领取中..."
									: "抢红包"}
						</button>

						<div className="mt-4 text-xs text-gray-600">
							<p className="my-1">
								最新红包ID:{" "}
								{totalPackets ? (Number(totalPackets) - 1).toString() : "0"}
							</p>
							<p className="my-1">提示: 红包ID从0开始</p>
						</div>
					</div>
				</div>

				{hash && (
					<div className="p-4 bg-gray-50 rounded border border-gray-200">
						<p className="mb-2">
							<strong>交易哈希:</strong>
						</p>
						<p className="text-xs break-all mb-0">{hash}</p>
						{isSuccess && (
							<p className="mt-2 mb-0 text-green-600">✓ 操作成功！</p>
						)}
					</div>
				)}
			</div>

			{/* 通知面板 */}
			{notifications.length > 0 && (
				<div className="p-6 bg-white rounded-lg shadow-sm mb-6">
					<h3 className="text-lg font-bold mb-4">实时通知 (事件监听)</h3>
					<div className="max-h-[300px] overflow-y-auto">
						{notifications.map((notif) => (
							<div
								key={notif.id}
								className="p-3 bg-gray-50 rounded mb-2 text-sm border border-gray-200"
							>
								{notif.message}
							</div>
						))}
					</div>
				</div>
			)}

			{/* 我的红包列表 */}
			{myPackets && myPackets.length > 0 && (
				<div className="p-6 bg-white rounded-lg shadow-sm mb-6">
					<h3 className="text-lg font-bold mb-4">我创建的红包</h3>
					<div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
						{myPackets.map((id: bigint) => (
							<PacketCard
								key={id.toString()}
								packetId={id}
								claimRecords={claimRecords.get(id.toString()) || []}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

// 红包卡片组件
function PacketCard({
	packetId,
	claimRecords,
}: {
	packetId: bigint
	claimRecords: ClaimRecord[]
}) {
	const [showDetails, setShowDetails] = useState(false)

	const { data: packetInfo } = useReadContract({
		address: RED_PACKET_ADDRESS as `0x${string}`,
		abi: RED_PACKET_ABI,
		functionName: "getPacketInfo",
		args: [packetId],
	})

	if (!packetInfo) return null

	const [
		,
		totalAmount,
		remainingAmount,
		totalCount,
		remainingCount,
		,
		isRandom,
	] = packetInfo
	const progress = Number(remainingCount) / Number(totalCount)
	const claimedCount = Number(totalCount) - Number(remainingCount)

	return (
		<div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
			<div className="flex justify-between mb-2">
				<span className="font-bold">红包 #{packetId.toString()}</span>
				<span
					className={`text-xs px-2 py-1 rounded text-white ${
						isRandom ? "bg-yellow-500" : "bg-cyan-600"
					}`}
				>
					{isRandom ? "随机" : "平均"}
				</span>
			</div>

			<div className="text-sm text-gray-600 mb-2">
				<p className="my-1">总金额: {formatEther(totalAmount)} ETH</p>
				<p className="my-1">剩余: {formatEther(remainingAmount)} ETH</p>
				<p className="my-1">
					个数: {remainingCount.toString()}/{totalCount.toString()}
				</p>
				<p className="my-1">已领取: {claimedCount}</p>
			</div>

			<div className="w-full h-2 bg-gray-200 rounded overflow-hidden mb-3">
				<div
					className={`h-full transition-all duration-300 ${
						progress > 0.5
							? "bg-green-600"
							: progress > 0.2
								? "bg-yellow-500"
								: "bg-red-600"
					}`}
					style={{ width: `${progress * 100}%` }}
				/>
			</div>

			{/* 查看详情按钮 */}
			<button
				type="button"
				onClick={() => setShowDetails(!showDetails)}
				className="w-full p-2 bg-gray-100 border border-gray-300 rounded text-xs cursor-pointer text-gray-700 hover:bg-gray-200 transition-colors"
			>
				{showDetails ? "▲ 收起详情" : `▼ 查看领取记录 (${claimRecords.length})`}
			</button>

			{/* 领取记录详情 */}
			{showDetails && (
				<div className="mt-3 p-3 bg-gray-100 rounded border border-gray-300">
					<h4 className="text-sm font-bold mb-2">领取记录</h4>
					{claimRecords.length === 0 ? (
						<p className="text-xs text-gray-600 m-0">暂无领取记录</p>
					) : (
						<div className="max-h-[200px] overflow-y-auto">
							{claimRecords.map((record, index) => (
								<div
									key={`${record.claimer}-${record.timestamp.toString()}`}
									className="p-2 mb-2 bg-white rounded text-xs border border-gray-200"
								>
									<div className="flex justify-between mb-1">
										<span className="font-bold text-gray-700">
											第 {index + 1} 个
										</span>
										<span className="text-green-600 font-bold">
											{formatEther(record.amount)} ETH
										</span>
									</div>
									<div className="text-gray-500">
										{record.claimer.slice(0, 10)}...{record.claimer.slice(-8)}
									</div>
									<div className="text-gray-400 text-[0.65rem] mt-1">
										{new Date(Number(record.timestamp) * 1000).toLocaleString(
											"zh-CN",
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	)
}
