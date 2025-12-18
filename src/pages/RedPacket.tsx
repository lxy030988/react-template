import { RedPacketSystem } from "@/components/RedPacket/RedPacketSystem"
import { WalletHeader } from "@/components/RedPacket/WalletHeader"

export default function RedPacket() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-rose-50 via-red-50 to-orange-50">
			<WalletHeader />

			<div className="max-w-7xl mx-auto px-4 pb-12">
				<RedPacketSystem />
			</div>
		</div>
	)
}
