# CSS 优化策略配置指南

## 当前配置状态

✅ **方案：不 inline CSS**（保持 CSS 文件独立）

### 为什么选择这个方案？

1. **HTML 文件小巧**：保持在 1.4KB，加载速度快
2. **长期缓存**：CSS 文件使用 contenthash，可以被浏览器长期缓存
3. **HTTP/2 优势**：并行加载多个资源
4. **Brotli 压缩**：CSS 从 33KB 压缩到 5.2KB

### 构建产物

```bash
dist/
├── index.html (1.4KB)
├── styles/
│   ├── main.a4b59.css (33KB)
│   ├── main.a4b59.css.gz (6.1KB)  # GZIP 压缩
│   └── main.a4b59.css.br (5.2KB)  # Brotli 压缩（推荐）
└── scripts/
    ├── *.bundle.js (414KB)
    └── *.bundle.js.br (103KB)
```

---

## 如果需要使用 Critters（关键 CSS Inline）

### 什么是 Critters？

Critters 是一个智能的关键 CSS 提取插件，它会：
- ✅ 只 inline 首屏可见内容需要的 CSS
- ✅ 非关键 CSS 异步加载
- ✅ 自动添加 preload 标签
- ✅ HTML 通常只增加 3-8KB

### 当前配置

Critters 已经安装并配置在 `webpack.production.js`：

```javascript
new Critters({
  external: false,         // 只处理本地 CSS
  inlineThreshold: 0,      // 内联首屏关键 CSS
  minimumExternalSize: 0,  // 最小化内联的 CSS
  preload: "swap",         // 为非关键 CSS 添加 preload
  pruneSource: false,      // 不裁剪字体
  compress: true,          // 压缩内联的 CSS
})
```

### 配置选项详解

| 参数 | 默认值 | 说明 | 推荐值 |
|------|--------|------|--------|
| `external` | `true` | 是否处理外部 CSS（CDN） | `false` |
| `inlineThreshold` | `0` | 小于此大小的 CSS 全部 inline（字节） | `0` 或 `5000` |
| `minimumExternalSize` | `0` | 外部 CSS 文件的最小大小 | `0` 或 `10000` |
| `preload` | `"body"` | preload 策略：`"body"`, `"media"`, `"swap"`, `"js"` | `"swap"` |
| `pruneSource` | `false` | 是否从外部 CSS 中移除已 inline 的样式 | `false` |
| `compress` | `true` | 是否压缩内联的 CSS | `true` |

### 常用配置方案

#### 方案 A：激进的 inline（首屏性能最优）

```javascript
new Critters({
  external: false,
  inlineThreshold: 0,           // 所有首屏 CSS 都 inline
  minimumExternalSize: 10000,   // 外部文件至少 10KB
  preload: "swap",
  pruneSource: true,            // 移除已 inline 的样式
  compress: true,
})
```

**效果**：
- HTML 增加到 5-10KB
- 首屏渲染最快
- 适合首屏内容简单的页面

#### 方案 B：保守的 inline（推荐）

```javascript
new Critters({
  external: false,
  inlineThreshold: 5000,        // 只 inline 小于 5KB 的 CSS
  minimumExternalSize: 0,
  preload: "swap",
  pruneSource: false,           // 保留完整的外部 CSS
  compress: true,
})
```

**效果**：
- HTML 增加到 3-5KB
- 平衡首屏性能和缓存效果
- 适合大多数场景

#### 方案 C：完全不 inline（当前配置）

**移除或注释掉 Critters 插件**：

```javascript
// new Critters({...})  // 注释掉
```

**效果**：
- HTML 保持 1.4KB
- 完全依赖 HTTP/2 和缓存
- 适合已经优化过服务器配置的项目

---

## 如何切换方案

### 1. 测试 Critters 效果

```bash
# 构建项目
pnpm run prod

# 查看 HTML 大小变化
ls -lh dist/index.html

# 查看 HTML 内容
head -50 dist/index.html | grep "<style"
```

如果看到 `<style>` 标签，说明 Critters 生效了。

### 2. 性能对比测试

使用 Chrome DevTools：

1. **不 inline（当前方案）**
   ```bash
   # 注释掉 Critters 配置
   # 重新构建
   pnpm run prod
   ```
   - 首字节时间 (TTFB)：更快
   - 首次内容绘制 (FCP)：可能稍慢
   - 总页面大小：更小

2. **使用 Critters**
   ```bash
   # 启用 Critters 配置
   # 重新构建
   pnpm run prod
   ```
   - TTFB：稍慢（HTML 更大）
   - FCP：更快（无需等待 CSS 下载）
   - 总页面大小：稍大

---

## 调试技巧

### 1. 查看 Critters 处理结果

构建时会输出日志：

```bash
⬡ Critters: Time 2.116958
```

### 2. 检查生成的 HTML

```bash
# 查看 inline 的 CSS
grep -A 10 "<style" dist/index.html

# 查看 preload 标签
grep "preload" dist/index.html
```

预期输出：

```html
<link rel="preload" as="style" href="/styles/main.a4b59.css">
<style>/* 首屏关键 CSS */</style>
<link rel="stylesheet" href="/styles/main.a4b59.css" media="print" onload="this.media='all'">
```

### 3. 问题排查

如果 Critters 没有生效：

1. **检查 CSS 文件是否存在**
   ```bash
   ls -l dist/styles/
   ```

2. **确认 HtmlWebpackPlugin 在 Critters 之前**
   ```javascript
   plugins: [
     new HtmlWebpackPlugin({...}),  // 必须在前面
     new Critters({...}),           // 必须在后面
   ]
   ```

3. **查看完整的构建日志**
   ```bash
   pnpm run prod 2>&1 | tee build.log
   ```

---

## 推荐配置

### 场景 1：首屏性能优先

✅ **使用 Critters（激进模式）**

适用于：
- 首次访问用户为主
- 首屏内容简单
- Lighthouse 评分要求高

### 场景 2：回访用户多

✅ **不使用 Critters（当前方案）**

适用于：
- 回访用户占比高（> 50%）
- 已配置 Nginx HTTP/2 + 强缓存
- CSS 文件较大（> 20KB）

### 场景 3：平衡方案

✅ **使用 Critters（保守模式）**

适用于：
- 需要兼顾首次和回访
- CSS 文件中等大小（10-30KB）
- 想要最佳的整体性能

---

## 配置文件位置

- Webpack 生产配置：`config/webpack.production.js`
- Critters 配置行：第 93-106 行
- 分包策略配置：`webpack.config.js` 第 68-147 行
- Nginx 配置：`NGINX_SETUP.md`

---

## 性能测试清单

- [ ] 测试首次访问的 FCP 时间
- [ ] 测试回访的加载速度
- [ ] 在慢速网络下测试（Chrome DevTools → Network → Slow 3G）
- [ ] 检查 Lighthouse 评分
- [ ] 验证 Brotli 压缩是否生效
- [ ] 测试浏览器缓存命中率

---

## 总结

| 方案 | HTML 大小 | 首屏速度 | 缓存效果 | 推荐场景 |
|------|----------|---------|---------|---------|
| 不 inline | 1.4KB | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **当前配置**，回访用户多 |
| Critters 保守 | 3-5KB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 平衡方案 |
| Critters 激进 | 5-10KB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 首次访问优先 |

**当前推荐**：保持现有配置（不 inline），因为你已经配置了 Nginx HTTP/2 + Brotli 压缩，CSS 文件压缩后只有 5.2KB。
