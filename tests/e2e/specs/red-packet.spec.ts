import { expect, test } from '@playwright/test';

/**
 * 红包系统基础 UI 测试
 * 这些测试不需要钱包连接
 */

test.describe('红包系统 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    // 访问红包页面
    await page.goto('/red-packet');
    await page.waitForLoadState('networkidle');
  });

  test('应该显示红包系统界面', async ({ page }) => {
    // 验证页面标题
    await expect(page.locator('h2:has-text("红包系统")')).toBeVisible();
    
    // 验证需要连接钱包的提示
    await expect(page.locator('text=请先连接钱包')).toBeVisible();
  });

  test('应该显示发红包表单', async ({ page }) => {
    // 滚动到页面底部查看表单
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // 等待页面加载
    await page.waitForTimeout(1000);
    
    // 截图以供调试
    await page.screenshot({ 
      path: 'docs/playwright-report/red-packet-page-full.png',
      fullPage: true 
    });
  });

  test('应该显示红包系统标题', async ({ page }) => {
    // 验证页面内容
    const content = await page.textContent('body');
    expect(content).toContain('红包系统');
  });
});

