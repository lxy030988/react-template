import { WALLET_PRESETS } from '../../support/mockWallet';

describe('Red Packet Page - Not Connected', () => {
  beforeEach(() => {
    cy.visit('/red-packet');
  });

  it('should display wallet header', () => {
    cy.contains('红包系统').should('be.visible');
    cy.contains('连接 MetaMask (Sepolia)').should('be.visible');
  });

  it('should display not connected message', () => {
    cy.contains('请先连接钱包').should('be.visible');
  });
  
  it('should have Red Packet subtitle', () => {
    cy.contains('Red Packet').should('be.visible');
  });
});

// 钱包连接测试（需要 wagmi 特殊配置，在 CI/CD 中暂时跳过）
// 说明：这些测试需要模拟完整的 wagmi provider，在无头浏览器环境中较难实现
// 在本地可以使用真实 MetaMask 进行手动测试
describe.skip('Red Packet Form Interactions - With Wallet (Manual Test Only)', () => {
  beforeEach(() => {
    // 方法：在页面加载前注入钱包
    cy.visit('/red-packet', {
      onBeforeLoad(win) {
        // 在页面加载前注入模拟钱包
        const { installMockWallet } = require('../../support/mockWallet');
        installMockWallet(win, WALLET_PRESETS.SEPOLIA_TESTNET);
      }
    });
    
    // 等待页面加载
    cy.contains('红包系统').should('be.visible');
    
    // 点击连接按钮
    cy.contains('连接 MetaMask (Sepolia)').click();
    
    // 等待连接完成
    cy.wait(1000);
  });

  it('should display wallet address after connection', () => {
    // 应该显示钱包地址（截断格式：前6位...后4位）
    cy.contains('0x742d...f0bE', { timeout: 10000 }).should('be.visible');
  });

  it('should display disconnect button after connection', () => {
    cy.contains('断开连接', { timeout: 10000 }).should('be.visible');
  });

  it('should display create packet form after wallet connected', () => {
    cy.contains('发红包', { timeout: 10000 }).should('be.visible');
    
    // 检查表单输入字段
    cy.get('input[placeholder="0.01"]').should('be.visible');
    cy.get('input[placeholder="3"]').should('be.visible');
  });

  it('should allow entering packet amount', () => {
    cy.get('input#amount', { timeout: 10000 }).should('be.visible');
    cy.get('input#amount').clear().type('0.5');
    cy.get('input#amount').should('have.value', '0.5');
  });

  it('should allow entering number of packets', () => {
    cy.get('input#count', { timeout: 10000 }).should('be.visible');
    cy.get('input#count').clear().type('5');
    cy.get('input#count').should('have.value', '5');
  });

  it('should display stats cards', () => {
    cy.contains('合约地址', { timeout: 10000 }).should('be.visible');
    cy.contains('红包总数').should('be.visible');
    cy.contains('我创建的').should('be.visible');
    cy.contains('我领取的').should('be.visible');
  });

  it('should display random checkbox', () => {
    cy.contains('随机红包', { timeout: 10000 }).should('be.visible');
    // 默认应该是选中状态
    cy.get('input[type="checkbox"]').should('be.checked');
  });

  it('should toggle random checkbox', () => {
    cy.contains('随机红包', { timeout: 10000 }).should('be.visible');
    
    // 取消选中
    cy.contains('随机红包').click();
    cy.get('input[type="checkbox"]').should('not.be.checked');
    cy.contains('每个红包金额平均').should('be.visible');
    
    // 重新选中
    cy.contains('随机红包').click();
    cy.get('input[type="checkbox"]').should('be.checked');
    cy.contains('每个红包金额随机').should('be.visible');
  });

  it('should handle disconnect wallet', () => {
    // 验证已连接
    cy.contains('0x742d...f0bE', { timeout: 10000 }).should('be.visible');
    
    // 点击断开连接按钮
    cy.contains('断开连接').click();
    
    // 应该重新显示连接按钮
    cy.contains('连接 MetaMask (Sepolia)', { timeout: 5000 }).should('be.visible');
    cy.contains('请先连接钱包').should('be.visible');
  });
});

describe.skip('Red Packet - Network Switching (Manual Test Only)', () => {
  beforeEach(() => {
    cy.visit('/red-packet', {
      onBeforeLoad(win) {
        const { installMockWallet } = require('../../support/mockWallet');
        installMockWallet(win, WALLET_PRESETS.SEPOLIA_TESTNET);
      }
    });
    
    // 等待页面加载
    cy.contains('红包系统').should('be.visible');
    
    // 点击连接按钮
    cy.contains('连接 MetaMask (Sepolia)').click();
    
    // 等待连接完成
    cy.wait(1000);
  });

  it('should display network badge', () => {
    // 应该显示 Sepolia 网络标识
    cy.contains('Sepolia', { timeout: 10000 }).should('be.visible');
  });

  it('should handle network change', () => {
    // 等待网络标识显示
    cy.contains('Sepolia', { timeout: 10000 }).should('be.visible');
    
    // 切换到以太坊主网
    cy.changeWalletChain('0x1');
    
    // 等待应用响应
    cy.wait(1000);
    
    // 验证应用仍然正常工作
    cy.contains('红包系统').should('be.visible');
  });
});

