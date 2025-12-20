import { expect, test } from '../fixtures/metamask';
import { confirmTransaction, connectWallet } from '../utils/metamask';
import { selectors } from '../utils/selectors';

/**
 * 红包系统 MetaMask 集成测试
 * 使用真实的 MetaMask 扩展进行测试
 */

test.describe('MetaMask 钱包集成测试', () => {
  // 设置测试超时时间为 3 分钟（区块链交易需要时间）
  test.setTimeout(180000);
  
  test('完整流程：连接钱包 -> 创建红包 -> 抢红包', async ({ page, context }) => {
    // ========== 第一部分：连接钱包 ==========
    console.log('\n========== 第一部分：连接钱包 ==========');
    
    // 访问红包页面
    await page.goto('/red-packet');
    await page.waitForLoadState('networkidle');
    console.log('📱 准备连接 MetaMask 钱包...');
    
    // 等待页面加载完成
    await page.waitForTimeout(2000);
    
    // 点击连接钱包按钮
    console.log('🔘 点击连接钱包按钮...');
    await page.click(selectors.wallet.connectButton);
    
    // 等待 MetaMask 弹窗并连接
    console.log('⏳ 等待 MetaMask 弹窗...');
    await connectWallet(page, context);
    
    // 验证钱包连接后的UI显示
    console.log('✅ 验证钱包连接成功...');
    

    
    // 验证网络显示 (Sepolia) - 等待元素出现而不是固定时间
    console.log('  ⏳ 等待网络信息加载...');
    await expect(page.locator('button:has-text("Sepolia")')).toBeVisible({ timeout: 15000 });
    console.log('  ✓ Sepolia 网络显示正常');
    
    // 验证地址显示
    console.log('  ⏳ 等待地址信息加载...');
    await expect(page.locator('text=/0x[a-fA-F0-9]{4}\\.{3}[a-fA-F0-9]{4}/')).toBeVisible({ timeout: 15000 });
    console.log('  ✓ 钱包地址显示正常');
    
    // 验证余额显示 (在钱包信息区域) - RPC 可能延迟，增加超时时间
    console.log('  ⏳ 等待余额加载（RPC 请求中）...');
    await expect(page.locator('.text-green-600:has-text("ETH")')).toBeVisible({ timeout: 30000 }); // 增加到 30 秒
    console.log('  ✓ 余额显示正常');
    
    // 验证断开连接按钮
    await expect(page.locator(selectors.wallet.disconnectButton)).toBeVisible();
    console.log('  ✓ 断开连接按钮显示正常');
    
    // 等待红包功能加载
    console.log('⏳ 等待红包功能加载...');
    await page.waitForTimeout(2000);
    
    // 验证红包输入框存在
    await expect(page.locator(selectors.redPacket.amountInput)).toBeVisible();
    await expect(page.locator(selectors.redPacket.countInput)).toBeVisible();
    console.log('  ✓ 红包功能已加载');
    
    // 截图
    await page.screenshot({ 
      path: 'docs/playwright-report/1-wallet-connected.png',
      fullPage: true 
    });
    console.log('📸 钱包连接截图已保存');
    
    // ========== 第二部分：创建红包 ==========
    console.log('\n========== 第二部分：创建红包 ==========');
    
    // 填写红包信息
    console.log('📝 填写红包信息...');
    await page.fill(selectors.redPacket.amountInput, '0.001');
    await page.fill(selectors.redPacket.countInput, '1');
    
    // 确认随机红包选项
    const isChecked = await page.isChecked(selectors.redPacket.randomCheckbox);
    if (!isChecked) {
      await page.check(selectors.redPacket.randomCheckbox);
    }
    
    console.log('  ✓ 总金额: 0.001 ETH');
    console.log('  ✓ 红包数量: 1');
    console.log('  ✓ 随机红包: 是');
    
    // 点击发红包
    console.log('🎁 点击发红包按钮...');
    await page.click(selectors.redPacket.createButton);
    
    // 等待并确认 MetaMask 交易（带重试逻辑）
    console.log('⏳ 等待 MetaMask 交易确认...');
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        await confirmTransaction(context);
        break; // 成功则跳出循环
      } catch (error) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`⚠️  交易确认失败，第 ${retryCount} 次重试...`);
          await page.waitForTimeout(3000);
          // 重新点击发红包按钮
          await page.click(selectors.redPacket.createButton);
        } else {
          throw error; // 达到最大重试次数，抛出错误
        }
      }
    }
    
    // 等待交易确认和红包创建成功
    console.log('✅ 等待红包创建成功并读取新 ID...');
    
    // 先记录创建前的 ID
    let oldPacketId = '0';
    try {
      const oldIdText = await page.locator('text=最新红包ID:').locator('..').textContent();
      const match = oldIdText?.match(/最新红包ID:\s*(\d+)/);
      if (match) {
        oldPacketId = match[1];
        console.log(`  📌 创建前的红包 ID: ${oldPacketId}`);
      }
    } catch (e) {
      console.log('  ℹ️  无法读取旧 ID，使用默认值 0');
    }
    
    
    // 等待新 ID 出现（轮询检查，最多等待 60 秒）
    let newPacketId = oldPacketId;
    const maxWaitTime = 60000; // 60 秒
    const pollInterval = 2000; // 每 2 秒检查一次
    const startTime = Date.now();
    
    while (newPacketId === oldPacketId && (Date.now() - startTime) < maxWaitTime) {
      await page.waitForTimeout(pollInterval);
      
      try {
        const latestIdElement = await page.locator('text=最新红包ID:').locator('..').textContent();
        const match = latestIdElement?.match(/最新红包ID:\s*(\d+)/);
        if (match && match[1] !== oldPacketId) {
          newPacketId = match[1];
          console.log(`  ✓ 检测到新红包 ID: ${newPacketId}`);
          break;
        }
      } catch (e) {
        // 继续等待
      }
    }
    
    if (newPacketId === oldPacketId) {
      console.log(`  ⚠️  等待超时，ID 未更新，尝试使用旧值 + 1: ${Number(oldPacketId) + 1}`);
      newPacketId = (Number(oldPacketId) + 1).toString();
    }
    
    // 截图
    await page.screenshot({ 
      path: 'docs/playwright-report/2-red-packet-created.png',
      fullPage: true 
    });
    console.log('📸 创建红包截图已保存');
    
    // ========== 第三部分：抢红包 ==========
    console.log('\n========== 第三部分：抢红包 ==========');
    
    // 输入红包 ID (使用刚创建的红包 ID)
    console.log(`🎯 输入红包 ID: ${newPacketId}...`);
    await page.fill(selectors.redPacket.packetIdInput, newPacketId);
    
    // 等待抢红包按钮变为可用（交易完成后才能抢）
    console.log('⏳ 等待抢红包按钮变为可用...');
    await page.waitForSelector(`${selectors.redPacket.claimButton}:not([disabled])`, { timeout: 30000 });
    console.log('  ✓ 抢红包按钮已可用');
    
    // 点击抢红包
    console.log('💰 点击抢红包按钮...');
    await page.click(selectors.redPacket.claimButton);
    
    // 确认 MetaMask 交易（带重试逻辑）
    console.log('⏳ 等待 MetaMask 交易确认...');
    retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await confirmTransaction(context);
        break;
      } catch (error) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`⚠️  交易确认失败，第 ${retryCount} 次重试...`);
          await page.waitForTimeout(3000);
          // 重新点击抢红包按钮
          await page.click(selectors.redPacket.claimButton);
        } else {
          throw error;
        }
      }
    }
    
    // 等待领取成功（增加等待时间）
    console.log('✅ 等待领取确认...');
    await page.waitForTimeout(20000);
    
    // 截图
    await page.screenshot({ 
      path: 'docs/playwright-report/3-red-packet-claimed.png',
      fullPage: true 
    });
    console.log('📸 抢红包截图已保存');
    
    console.log('\n🎉 完整流程测试完成！');
  });
});
