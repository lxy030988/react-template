# LocalForage 本地缓存使用指南

## 概述

已为项目集成 **localForage**，提供统一的客户端存储 API，自动使用最佳存储引擎：

**IndexedDB** → **WebSQL** → **localStorage**

---

## 快速开始

### 1. 访问演示页面

**地址**：http://localhost:3000/storage-demo

演示功能：
- 💾 存储引擎信息（自动选择 IndexedDB）
- 🪝 useStorage Hook 演示
- 🌐 API 缓存示例
- ⚙️ 高级存储操作

---

## 使用方法

### useStorage Hook（推荐）

类似 `useState`，但数据自动持久化到 IndexedDB：

```typescript
import { useStorage } from '@/hooks/useStorage'

function MyComponent() {
  // 用法与 useState 完全相同
  const [name, setName] = useStorage('user-name', 'Guest')
  const [settings, setSettings] = useStorage('app-settings', {
    theme: 'dark',
    fontSize: 14
  })

  return (
    <div>
      <input 
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {/* 刷新页面数据不会丢失！ */}
    </div>
  )
}
```

**特点**：
- ✅ API 与 `useState` 完全一致
- ✅ 自动持久化到 IndexedDB
- ✅ 支持任意 JSON 可序列化的数据
- ✅ TypeScript 类型安全

---

### 直接使用 Storage 实例

#### appStorage - 应用数据

```typescript
import { appStorage } from '@/utils/storage'

// 保存数据
await appStorage.setItem('theme', 'dark')

// 读取数据
const theme = await appStorage.getItem('theme')

// 删除数据
await appStorage.removeItem('theme')

// 清空所有数据
await appStorage.clear()
```

#### cacheStorage - API 缓存

```typescript
import { cacheStorage } from '@/utils/storage'

// 缓存 API 响应
async function fetchUserData(userId: string) {
  const cached = await cacheStorage.getItem(`user-${userId}`)
  if (cached) {
    console.log('从缓存加载')
    return cached
  }

  const data = await fetch(`/api/users/${userId}`).then(r => r.json())
  await cacheStorage.setItem(`user-${userId}`, data)
  return data
}
```

#### userStorage - 用户数据

```typescript
import { userStorage } from '@/utils/storage'

// 保存用户偏好
await userStorage.setItem('preferences', {
  language: 'zh-CN',
  notifications: true
})
```

---

### StorageManager 工具

批量操作和实用工具：

```typescript
import { StorageManager, appStorage } from '@/utils/storage'

// 查看当前存储引擎
const driver = await StorageManager.getDriver()
console.log(driver) // "IndexedDB"

// 获取所有键
const keys = await StorageManager.keys(appStorage)
console.log(keys) // ["user-name", "demo-settings", ...]

// 批量设置
await StorageManager.setItems({
  'key1': 'value1',
  'key2': { data: 'value2' },
  'key3': [1, 2, 3]
})

// 批量获取
const items = await StorageManager.getItems(['key1', 'key2'])
console.log(items) // { key1: 'value1', key2: { data: 'value2' } }

// 清空存储
await StorageManager.clear(appStorage)
```

---

## 文件结构

```
src/
├── utils/
│   └── storage.ts          # localForage 配置和 StorageManager
├── hooks/
│   └── useStorage.ts       # useStorage Hook
└── pages/
    └── StorageDemo.tsx     # 演示页面
```

---

## API 参考

### useStorage Hook

```typescript
function useStorage<T>(
  key: string,
  initialValue: T,
  storage?: typeof localforage
): [T, (value: T | ((val: T) => T)) => void, boolean]
```

**参数**：
- `key`: 存储键名
- `initialValue`: 初始值
- `storage`: 可选，指定存储实例（默认 `appStorage`）

**返回**：
- `[0]`: 当前值
- `[1]`: 更新函数
- `[2]`: 是否正在加载

**示例**：

```typescript
const [count, setCount, isLoading] = useStorage('counter', 0)

// 直接设置值
setCount(10)

// 使用函数更新
setCount(prev => prev + 1)

// 检查加载状态
if (isLoading) return <Loading />
```

---

### Storage 实例方法

所有存储实例（`appStorage`, `cacheStorage`, `userStorage`）都支持：

```typescript
// 设置
await storage.setItem<T>(key: string, value: T): Promise<T>

// 获取
await storage.getItem<T>(key: string): Promise<T | null>

// 删除
await storage.removeItem(key: string): Promise<void>

// 清空
await storage.clear(): Promise<void>

// 获取所有键
await storage.keys(): Promise<string[]>

// 获取长度
await storage.length(): Promise<number>

// 迭代
await storage.iterate((value, key) => {
  console.log(key, value)
})
```

---

## 存储引擎

### IndexedDB（优先使用）

- ✅ 容量大（至少 50MB，通常更多）
- ✅ 支持复杂数据类型
- ✅ 异步 API，不阻塞主线程
- ✅ 事务支持

### WebSQL（降级）

- ⚠️ 已废弃，但部分浏览器仍支持
- 容量约 5-10MB

### localStorage（最后降级）

- ⚠️ 同步 API，会阻塞主线程
- 容量约 5-10MB
- 只支持字符串

**localForage 会自动选择最佳引擎，无需手动配置！**

---

## 浏览器兼容性

| 浏览器 | IndexedDB | WebSQL | localStorage |
|--------|-----------|--------|--------------|
| Chrome | ✅ | ✅ | ✅ |
| Firefox | ✅ | ❌ | ✅ |
| Safari | ✅ | ✅ | ✅ |
| Edge | ✅ | ❌ | ✅ |

**结论**：几乎所有现代浏览器都支持 IndexedDB

---

## DevTools 调试

### Chrome DevTools

1. 打开 DevTools（F12）
2. **Application** 标签
3. **IndexedDB** → `react-template`
4. 查看存储的数据

可以看到：
- `app_storage`: 应用数据
- `api_cache`: API 缓存
- `user_data`: 用户数据

### 手动清空数据

```javascript
// 在 Console 中执行
indexedDB.deleteDatabase('react-template')
```

---

## 最佳实践

### 1. 数据命名规范

```typescript
// ✅ 好的命名
'user-profile'
'app-settings'
'api-cache-users-123'

// ❌ 不好的命名
'data'
'temp'
'x'
```

### 2. 合理使用不同的存储

```typescript
// appStorage: 应用状态
appStorage.setItem('theme', 'dark')

// cacheStorage: API 缓存（可以定期清理）
cacheStorage.setItem('api-data', data)

// userStorage: 用户数据（个人资料、偏好）
userStorage.setItem('user-profile', profile)
```

### 3. 错误处理

```typescript
try {
  await appStorage.setItem('key', 'value')
} catch (error) {
  console.error('存储失败:', error)
  // 降级到内存存储或提示用户
}
```

### 4. 缓存失效策略

```typescript
interface CachedData<T> {
  data: T
  timestamp: number
  ttl: number // 生存时间（毫秒）
}

async function getCachedData<T>(key: string, fetchFn: () => Promise<T>, ttl = 5 * 60 * 1000) {
  const cached = await cacheStorage.getItem<CachedData<T>>(key)
  
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data
  }
  
  const data = await fetchFn()
  await cacheStorage.setItem(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
  
  return data
}
```

---

## 常见问题

### Q: 数据会在什么时候清空？

A: IndexedDB 数据会一直保留，直到：
- 用户手动清空浏览器数据
- 调用 `clear()` 方法
- 浏览器空间不足（极少发生）

### Q: 可以存储多大的数据？

A: 
- IndexedDB：通常至少 50MB，Chrome/Edge 可达数百 MB
- localStorage：约 5-10MB
- 建议单个值不超过 10MB

### Q: 性能如何？

A:
- IndexedDB：异步，不阻塞 UI
- localStorage：同步，大数据会卡顿
- localForage 自动选择最佳方案

### Q: 是否支持跨标签页同步？

A: 不支持自动同步。需要使用 `BroadcastChannel` 或 `storage` 事件手动实现。

---

## 下一步

- ✅ localForage 已集成并可用
- ⏳ Workbox Service Worker（PWA 离线功能）- 待实施

查看演示页面了解更多：http://localhost:3000/storage-demo
