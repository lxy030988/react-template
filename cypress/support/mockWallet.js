/**
 * Mock Web3 Wallet for Cypress Testing
 * 模拟 MetaMask 和其他 Web3 钱包的功能
 */

export class MockWallet {
  constructor(config = {}) {
    this.chainId = config.chainId || '0x1'; // 默认以太坊主网
    this.accounts = config.accounts || ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'];
    this.balance = config.balance || '1000000000000000000'; // 1 ETH in Wei
    this.isConnected = false;
    this.listeners = {};
  }

  /**
   * 创建模拟的 ethereum provider
   */
  createProvider() {
    const self = this;
    
    return {
      isMetaMask: true,
      chainId: self.chainId,
      selectedAddress: null,
      
      // 请求方法
      request: async ({ method, params }) => {
        console.log('Mock Wallet Request:', method, params);
        
        switch (method) {
          case 'eth_requestAccounts':
            self.isConnected = true;
            self.selectedAddress = self.accounts[0];
            this.selectedAddress = self.accounts[0];
            
            // 触发 accountsChanged 事件
            if (self.listeners.accountsChanged) {
              self.listeners.accountsChanged.forEach(fn => fn(self.accounts));
            }
            
            return self.accounts;
            
          case 'eth_accounts':
            return self.isConnected ? self.accounts : [];
            
          case 'eth_chainId':
            return self.chainId;
            
          case 'wallet_switchEthereumChain':
            self.chainId = params[0].chainId;
            if (self.listeners.chainChanged) {
              self.listeners.chainChanged.forEach(fn => fn(self.chainId));
            }
            return null;
            
          case 'wallet_addEthereumChain':
            self.chainId = params[0].chainId;
            return null;
            
          case 'eth_getBalance':
            return self.balance;
            
          case 'eth_sendTransaction':
            // 模拟交易哈希
            return '0x' + 'a'.repeat(64);
            
          case 'personal_sign':
          case 'eth_sign':
            // 模拟签名
            return '0x' + 'b'.repeat(130);
            
          case 'eth_signTypedData_v4':
            // 模拟类型化数据签名
            return '0x' + 'c'.repeat(130);
            
          case 'eth_call':
            // 模拟合约调用
            return '0x0000000000000000000000000000000000000000000000000000000000000001';
            
          case 'eth_estimateGas':
            // 模拟 gas 估算
            return '0x5208'; // 21000 in hex
            
          case 'eth_gasPrice':
            // 模拟 gas 价格
            return '0x3b9aca00'; // 1 Gwei in hex
            
          case 'eth_getTransactionReceipt':
            // 模拟交易收据
            return {
              status: '0x1',
              transactionHash: params[0],
              blockNumber: '0x1',
              gasUsed: '0x5208'
            };
            
          default:
            console.warn('Unhandled method:', method);
            return null;
        }
      },
      
      // 事件监听
      on: (event, callback) => {
        if (!self.listeners[event]) {
          self.listeners[event] = [];
        }
        self.listeners[event].push(callback);
      },
      
      // 移除监听
      removeListener: (event, callback) => {
        if (self.listeners[event]) {
          self.listeners[event] = self.listeners[event].filter(fn => fn !== callback);
        }
      },
      
      // 兼容旧的 API
      enable: async () => {
        return self.createProvider().request({ method: 'eth_requestAccounts' });
      },
      
      // 发送方法（旧 API）
      send: (method, params) => {
        return self.createProvider().request({ method, params });
      }
    };
  }
  
  /**
   * 触发账户变更事件
   */
  changeAccount(newAccount) {
    this.accounts = [newAccount];
    this.selectedAddress = newAccount;
    
    if (this.listeners.accountsChanged) {
      this.listeners.accountsChanged.forEach(fn => fn(this.accounts));
    }
  }
  
  /**
   * 触发网络变更事件
   */
  changeChain(newChainId) {
    this.chainId = newChainId;
    
    if (this.listeners.chainChanged) {
      this.listeners.chainChanged.forEach(fn => fn(this.chainId));
    }
  }
  
  /**
   * 断开连接
   */
  disconnect() {
    this.isConnected = false;
    this.selectedAddress = null;
    
    if (this.listeners.accountsChanged) {
      this.listeners.accountsChanged.forEach(fn => fn([]));
    }
  }
}

/**
 * 安装模拟钱包到 window 对象
 */
export function installMockWallet(win, config = {}) {
  const mockWallet = new MockWallet(config);
  const provider = mockWallet.createProvider();
  
  // 安装到 window
  win.ethereum = provider;
  
  // 存储 mockWallet 实例以便后续操作
  win.__mockWallet = mockWallet;
  
  return mockWallet;
}

/**
 * 预设配置
 */
export const WALLET_PRESETS = {
  // 以太坊主网
  ETHEREUM_MAINNET: {
    chainId: '0x1',
    accounts: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'],
    balance: '1000000000000000000' // 1 ETH
  },
  
  // Sepolia 测试网
  SEPOLIA_TESTNET: {
    chainId: '0xaa36a7',
    accounts: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'],
    balance: '10000000000000000000' // 10 ETH
  },
  
  // Polygon 主网
  POLYGON_MAINNET: {
    chainId: '0x89',
    accounts: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'],
    balance: '1000000000000000000'
  },
  
  // 无余额账户
  NO_BALANCE: {
    chainId: '0x1',
    accounts: ['0x0000000000000000000000000000000000000000'],
    balance: '0'
  }
};
