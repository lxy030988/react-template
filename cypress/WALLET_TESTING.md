# Cypress 钱包模拟测试指南

## 概述

本项目包含完整的 Web3 钱包模拟工具，用于在 Cypress E2E 测试中模拟 MetaMask 等钱包的功能。

> **重要提示**：由于项目使用 wagmi 库进行钱包管理，完整的钱包连接测试在 CI/CD 无头浏览器环境中较难实现。目前钱包连接相关的测试被标记为 `.skip`，仅在本地使用真实 MetaMask 进行手动测试。

## 快速开始

### 1. 基础用法

```javascript
import { WALLET_PRESETS } from '../../support/mockWallet';

describe('测试钱包功能', () => {
  beforeEach(() => {
    // 方法一：在页面加载前注入钱包（推荐）
    cy.visit('/red-packet', {
      onBeforeLoad(win) {
        const { installMockWallet } = require('../../support/mockWallet');
        installMockWallet(win, WALLET_PRESETS.SEPOLIA_TESTNET);
      }
    });
    
    // 连接钱包
    cy.connectWallet(WALLET_PRESETS.SEPOLIA_TESTNET);
  });

  it('应该显示已连接的钱包地址', () => {
    cy.contains('0x742d...f0bEb').should('be.visible');
  });
});
```

## 可用的 Cypress 命令

### `cy.connectWallet(config)`

连接模拟钱包到应用。

**参数：**
- `config` - 钱包配置对象（可选，默认为以太坊主网）

**示例：**
```javascript
// 使用默认配置（以太坊主网）
cy.connectWallet();

// 使用预设配置
cy.connectWallet(WALLET_PRESETS.SEPOLIA_TESTNET);

// 使用自定义配置
cy.connectWallet({
  chainId: '0x89', // Polygon
  accounts: ['0xYourCustomAddress'],
  balance: '5000000000000000000' // 5 ETH in Wei
});
```

### `cy.disconnectWallet()`

断开钱包连接。

**示例：**
```javascript
cy.disconnectWallet();
cy.contains('连接 MetaMask').should('be.visible');
```

### `cy.changeWalletAccount(address)`

切换到不同的钱包账户。

**参数：**
- `address` - 新的钱包地址

**示例：**
```javascript
cy.changeWalletAccount('0x1234567890123456789012345678901234567890');
```

### `cy.changeWalletChain(chainId)`

切换到不同的区块链网络。

**参数：**
- `chainId` - 链 ID（十六进制格式）

**示例：**
```javascript
cy.changeWalletChain('0xaa36a7'); // 切换到 Sepolia
cy.changeWalletChain('0x89');     // 切换到 Polygon
```

## 预设配置

### `WALLET_PRESETS.ETHEREUM_MAINNET`
- Chain ID: `0x1`
- 账户: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- 余额: 1 ETH

### `WALLET_PRESETS.SEPOLIA_TESTNET`
- Chain ID: `0xaa36a7`
- 账户: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- 余额: 10 ETH

### `WALLET_PRESETS.POLYGON_MAINNET`
- Chain ID: `0x89`
- 账户: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- 余额: 1 MATIC

### `WALLET_PRESETS.NO_BALANCE`
- Chain ID: `0x1`
- 账户: `0x0000000000000000000000000000000000000000`
- 余额: 0

## 支持的 Web3 方法

模拟钱包支持以下以太坊 RPC 方法：

### 账户管理
- ✅ `eth_requestAccounts` - 请求账户访问
- ✅ `eth_accounts` - 获取账户列表
- ✅ `eth_getBalance` - 获取余额

### 网络相关
- ✅ `eth_chainId` - 获取链 ID
- ✅ `wallet_switchEthereumChain` - 切换网络
- ✅ `wallet_addEthereumChain` - 添加新网络

### 签名和交易
- ✅ `eth_sendTransaction` - 发送交易
- ✅ `personal_sign` - 个人签名
- ✅ `eth_sign` - 标准签名
- ✅ `eth_signTypedData_v4` - 类型化数据签名
- ✅ `eth_estimateGas` - 估算 Gas
- ✅ `eth_gasPrice` - 获取 Gas 价格

### 合约交互
- ✅ `eth_call` - 合约调用
- ✅ `eth_getTransactionReceipt` - 获取交易收据

## 高级用法

### 测试账户切换

```javascript
it('应该在账户切换时更新 UI', () => {
  cy.connectWallet(WALLET_PRESETS.ETHEREUM_MAINNET);
  cy.contains('0x742d...f0bEb').should('be.visible');
  
  // 切换账户
  cy.changeWalletAccount('0xABCDEF1234567890123456789012345678901234');
  cy.contains('0xABCD...1234').should('be.visible');
});
```

### 测试网络切换

```javascript
it('应该在网络切换时显示警告', () => {
  cy.connectWallet(WALLET_PRESETS.ETHEREUM_MAINNET);
  
  // 切换到测试网
  cy.changeWalletChain('0xaa36a7');
  
  // 验证警告信息
  cy.contains('请切换到主网').should('be.visible');
});
```

### 测试无余额场景

```javascript
it('应该在余额不足时禁用发送按钮', () => {
  cy.connectWallet(WALLET_PRESETS.NO_BALANCE);
  
  cy.get('button[type="submit"]').should('be.disabled');
  cy.contains('余额不足').should('be.visible');
});
```

### 测试钱包未连接状态

```javascript
it('应该显示连接提示', () => {
  cy.visit('/red-packet'); // 不连接钱包
  
  cy.contains('请先连接钱包').should('be.visible');
  cy.contains('连接 MetaMask').should('be.visible');
});
```

### 自定义钱包配置

```javascript
it('应该支持自定义配置', () => {
  const customConfig = {
    chainId: '0x38', // BSC
    accounts: ['0xYourAddress'],
    balance: '100000000000000000000' // 100 ETH
  };
  
  cy.visit('/app', {
    onBeforeLoad(win) {
      const { installMockWallet } = require('../../support/mockWallet');
      installMockWallet(win, customConfig);
    }
  });
  
  cy.connectWallet(customConfig);
});
```

## 事件监听

模拟钱包支持以下事件：

- `accountsChanged` - 账户变更
- `chainChanged` - 网络变更

这些事件会在调用相应的命令时自动触发，应用可以正常监听和响应。

## 常见问题

### Q: 为什么需要在 `onBeforeLoad` 中注入钱包？

A: 因为很多 Web3 应用会在页面加载时立即检查 `window.ethereum` 是否存在。在 `onBeforeLoad` 中注入可以确保钱包对象在应用初始化之前就已经存在。

### Q: 能测试真实的区块链交互吗？

A: 不能。这是一个完全的模拟环境，所有的交易和调用都是假的。如果需要测试真实的区块链交互，建议使用本地测试网如 Ganache 或 Hardhat Network。

### Q: 模拟钱包会影响其他测试吗？

A: 不会。每个测试都有独立的 window 对象，钱包模拟只在当前测试的 window 中有效。

### Q: 如何调试钱包相关的问题？

A: 模拟钱包会在控制台打印所有的 RPC 请求。在 Cypress Test Runner 中打开浏览器控制台即可查看详细日志。

## 完整示例

查看 `cypress/e2e/red-packet/form-interactions.cy.js` 获取完整的测试示例。

## 相关文件

- `cypress/support/mockWallet.js` - 钱包模拟核心实现
- `cypress/support/commands.js` - Cypress 自定义命令
- `cypress/e2e/red-packet/form-interactions.cy.js` - 使用示例
