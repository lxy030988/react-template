import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [sepolia, mainnet],
  connectors: [
    injected(), // MetaMask 和其他注入式钱包
  ],
  transports: {
    // 使用 Alchemy 公共端点，更稳定
    [sepolia.id]: http('https://sepolia.infura.io/v3/e39eb2cf31af4df7a8295c99be90d363'),
    [mainnet.id]: http(),
  },
});
