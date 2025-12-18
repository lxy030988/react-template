// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import { installMockWallet, WALLET_PRESETS } from './mockWallet';

// ================================================
// Web3 钱包模拟命令
// ================================================

/**
 * 连接模拟钱包
 * @param {Object} config - 钱包配置，可使用 WALLET_PRESETS 中的预设
 * @example cy.connectWallet() // 使用默认配置
 * @example cy.connectWallet(WALLET_PRESETS.SEPOLIA_TESTNET)
 */
Cypress.Commands.add('connectWallet', (config = WALLET_PRESETS.ETHEREUM_MAINNET) => {
  cy.window().then((win) => {
    const mockWallet = installMockWallet(win, config);
    
    // 自动触发连接
    return win.ethereum.request({ method: 'eth_requestAccounts' })
      .then(() => {
        cy.log('✅ 钱包已连接', config);
        // 等待应用响应钱包连接
        cy.wait(500);
      });
  });
});

/**
 * 断开钱包连接
 * @example cy.disconnectWallet()
 */
Cypress.Commands.add('disconnectWallet', () => {
  cy.window().then((win) => {
    if (win.__mockWallet) {
      win.__mockWallet.disconnect();
      cy.log('❌ 钱包已断开');
      cy.wait(500);
    }
  });
});

/**
 * 切换钱包账户
 * @param {string} newAccount - 新的账户地址
 * @example cy.changeWalletAccount('0x1234567890123456789012345678901234567890')
 */
Cypress.Commands.add('changeWalletAccount', (newAccount) => {
  cy.window().then((win) => {
    if (win.__mockWallet) {
      win.__mockWallet.changeAccount(newAccount);
      cy.log('🔄 账户已切换至', newAccount);
      cy.wait(500);
    }
  });
});

/**
 * 切换钱包网络
 * @param {string} chainId - 新的链 ID (hex 格式)
 * @example cy.changeWalletChain('0xaa36a7') // Sepolia
 */
Cypress.Commands.add('changeWalletChain', (chainId) => {
  cy.window().then((win) => {
    if (win.__mockWallet) {
      win.__mockWallet.changeChain(chainId);
      cy.log('🌐 网络已切换至', chainId);
      cy.wait(500);
    }
  });
});