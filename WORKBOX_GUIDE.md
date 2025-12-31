# Workbox Service Worker 使用指南

## 概述

项目已集成 **Workbox Service Worker**，实现：
- ✅ 离线访问（PWA）
- ✅ 资源缓存（提升加载速度）
- ✅ 自动更新机制

---

## 缓存策略

### 1. Cache First - JS/CSS 静态资源

**优先使用缓存，缓存未命中时从网络获取**

```typescript
// JS/CSS 文件
Cache → (命中) → 返回
     ↓ (未命中)
  Network → 缓存 → 返回
```

**配置**：
- 缓存时间：30 天
- 最大条目：60 个
- 适用：`*.js`, `*.css`

### 2. Cache First - 图片资源

**图片优先从缓存加载**

**配置**：
- 缓存时间：30 天
- 最大条目：100 个
- 适用：所有图片格式

### 3. Cache First - 字体资源

**字体永久缓存**

**配置**：
- 缓存时间：1 年
- 最大条目：30 个
- 适用：字体文件

### 4. Network First - API 请求

**优先网络，失败时使用缓存（离线支持）**

```typescript
Network → (成功) → 缓存 → 返回
       ↓ (失败)
     Cache → 返回
```

**配置**：
- 缓存时间：5 分钟
- 最大条目：50 个
- 网络超时：10 秒
- 适用：`/api/*` 路径

### 5. Stale While Revalidate - CDN 资源

**立即返回缓存，后台更新**

```typescript
Request → Cache → 立即返回
              ↓
          Network → 更新缓存（后台）
```

**配置**：
- 缓存时间：7 天
- 最大条目：50 个
- 适用：unpkg.com, cdn.jsdelivr.net

---

## 预缓存

### 自动预缓存

Webpack 构建时自动预缓存：
- ✅ HTML 文件
- ✅ JS bundles
- ✅ CSS 样式表

**当前预缓存**：18 个文件，共 510 KB

### 查看预缓存列表

```bash
# 构建后查看
cat dist/service-worker.js | grep 'url:'
```

---

## 使用方法

### 生产环境自动启用

Service Worker **仅在生产环境**自动注册：

```typescript
// src/index.tsx
if (process.env.NODE_ENV === 'production') {
  registerServiceWorker()
}
```

### 手动注册（开发调试）

```typescript
import { registerServiceWorker } from '@/utils/serviceWorkerRegistration'

// 手动注册
const wb = registerServiceWorker()
```

### 注销 Service Worker

```typescript
import { unregisterServiceWorker } from '@/utils/serviceWorkerRegistration'

// 注销（用于调试）
await unregisterServiceWorker()
```

---

## 测试离线功能

### 方法 1：使用生产构建

```bash
# 1. 构建
pnpm run prod

# 2. 启动静态服务器
npx serve -s dist -p 8080

# 3. 访问
open http://localhost:8080
```

### 方法 2：Chrome DevTools

1. 打开 **Chrome DevTools** (F12)
2. **Application** → **Service Workers**
3. 勾选 **Offline**
4. 刷新页面

**预期**：页面仍然可以加载 ✅

---

## DevTools 验证

### 1. 查看 Service Worker 状态

**Application → Service Workers**

应该看到：
- ✅ Status: **activated and is running**
- ✅ Update on reload (开发时勾选)

### 2. 查看缓存

**Application → Cache Storage**

缓存列表：
- `workbox-precache-v2-*` - 预缓存
- `static-resources` - JS/CSS
- `images` - 图片
- `fonts` - 字体
- `api-cache` - API响应
- `cdn-cache` - CDN资源

### 3. 模拟离线

**Network → Throttling → Offline**

刷新页面，检查是否可以访问。

---

## 更新机制

### 自动检测更新

Service Worker 会：
- ✅ 每小时检查一次更新
- ✅ 刷新页面时检查更新

### 用户提示

当有新版本时，会弹出确认框：

```
有新版本可用！点击确定刷新页面以获取最新内容。
```

点击确定后自动刷新。

### 跳过等待（立即激活）

```typescript
// Service Worker 中
self.addEventListener('install', () => {
  self.skipWaiting() // 立即激活
})
```

---

## 配置说明

### 修改缓存时间

编辑 `src/service-worker.ts`：

```typescript
// 修改 JS/CSS 缓存时间为 7 天
new ExpirationPlugin({
  maxEntries: 60,
  maxAgeSeconds: 7 * 24 * 60 * 60, // 原本 30 天
})
```

### 添加新的缓存策略

```typescript
import { CacheFirst } from 'workbox-strategies'
import { registerRoute } from 'workbox-routing'

// 缓存视频文件
registerRoute(
  ({ request }) => request.destination === 'video',
  new CacheFirst({
    cacheName: 'videos',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  })
)
```

### 排除特定文件

编辑 `config/webpack.production.js`：

```javascript
new InjectManifest({
  // ...
  exclude: [
    /\.map$/,
    /manifest$/,
    /\.br$/,
    /\.gz$/,
    /^service-worker\.js$/,
    /large-file\.js$/, // 添加：排除大文件
  ],
})
```

---

## 常见问题

### Q: 为什么开发环境没有 Service Worker？

A: Service Worker 只在 **production** 环境启用，避免缓存干扰开发。

### Q: 如何清除所有缓存？

A: DevTools → Application → Cache Storage → 右键 → Delete

或代码：
```typescript
caches.keys().then(names => {
  names.forEach(name => caches.delete(name))
})
```

### Q: Service Worker 更新后没有生效？

A: 
1. 关闭所有标签页
2. DevTools → Application → Service Workers → Unregister
3. 清除缓存
4. 重新访问

或点击 **skipWaiting** 按钮。

### Q: 离线时 API 请求失败？

A: 
- API 使用 **Network First** 策略
- 首次访问时网络必须可用（建立缓存）
- 之后离线时才能使用缓存

### Q: 如何完全禁用 Service Worker？

A: 
```typescript
// src/index.tsx
// 注释掉这段代码
// if (process.env.NODE_ENV === 'production') {
//   registerServiceWorker()
// }
```

---

## 性能提升

### 加载速度

| 场景 | 无SW | 有SW + 缓存 |
|------|------|------------|
| 首次访问 | 2-3s | 2-3s |
| 再次访问 | 1-2s | **< 0.5s** ⚡ |
| 离线访问 | ❌ | ✅ |

### 带宽节省

- ✅ 减少重复下载
- ✅ 只下载更新的文件
- ✅ 压缩 + 缓存双重优化

---

## 最佳实践

### 1. 合理设置缓存时间

- **静态资源**（带 hash）：长期缓存（30天+）
- **动态内容**：短期缓存（分钟级）
- **API 数据**：根据业务需求（5-15分钟）

### 2. 限制缓存大小

```typescript
new ExpirationPlugin({
  maxEntries: 50,      // 最多50个
  maxAgeSeconds: ...,  // 防止缓存无限增长
})
```

### 3. 提供更新提示

当前实现：弹窗提示用户刷新

更好的方式：Toast 通知 + "刷新"按钮

### 4. 监控缓存命中率

```typescript
// 在 Service Worker 中
self.addEventListener('fetch', (event) => {
  console.log(
    '[SW] Fetch:',
    event.request.url,
    event.request.mode
  )
})
```

---

## 调试技巧

### 1. 查看 Service Worker 日志

DevTools → Console → 选择 Service Worker 上下文

### 2. 模拟慢速网络

Network → Throttling → Slow 3G

### 3. 强制更新 Service Worker

DevTools → Application → Service Workers → Update

### 4. 查看缓存内容

```javascript
// Console 中执行
caches.open('static-resources').then(cache => {
  cache.keys().then(keys => console.log(keys))
})
```

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `src/service-worker.ts` | SW 主文件（缓存策略） |
| `src/utils/serviceWorkerRegistration.ts` | 注册工具 |
| `config/webpack.production.js` | Workbox 配置 |
| `dist/service-worker.js` | 编译后的 SW |

---

## 下一步

- [ ] 添加 PWA manifest.json
- [ ] 实现更优雅的更新提示
- [ ] 监控缓存性能
- [ ] 根据实际使用调整缓存策略

---

## 相关资源

- [Workbox 官方文档](https://developers.google.com/web/tools/workbox)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Checklist](https://web.dev/pwa-checklist/)
