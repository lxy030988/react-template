# Nginx 本地开发环境配置指南

本文档说明如何使用Nginx为本项目配置HTTP/2、HTTP/3和缓存策略。

## 快速开始

### 访问地址
- **HTTP/2 (HTTPS)**: https://localhost/
- **HTTP/3 (QUIC)**: https://localhost:8443/
- **HTTP**: http://localhost/ (自动重定向到HTTPS)

### 服务管理命令

```bash
# 启动nginx
sudo nginx

# 停止nginx
sudo nginx -s stop

# 重新加载配置（不中断服务）
sudo nginx -s reload

# 测试配置语法
nginx -t
```

## 配置详情

### 已配置功能

✅ **HTTP/2支持** (端口443)
- 多路复用、头部压缩
- 提升页面加载性能

✅ **HTTP/3支持** (端口8443)  
- 基于QUIC协议
- 更低延迟、更好的弱网表现

✅ **ETag协商缓存**
- 所有文件自动生成ETag
- 304 Not Modified响应减少带宽

✅ **分类型强缓存策略**

| 资源类型 | 缓存策略 | 说明 |
|---------|---------|------|
| HTML | `no-cache` | 每次都向服务器验证，确保内容最新 |
| JS/CSS | `max-age=31536000, immutable` | 强缓存1年，不会重新验证 |
| 图片 | `max-age=2592000` | 强缓存30天 |
| 字体 | `max-age=31536000, immutable` | 强缓存1年 |

### 配置文件位置

- **主配置**: `/opt/homebrew/etc/nginx/nginx.conf`
- **服务器配置**: `/opt/homebrew/etc/nginx/servers/react-template.conf`
- **SSL证书**: `/opt/homebrew/etc/nginx/ssl/`
- **配置备份**: `./react-template.conf`

### 文档目录

- **静态资源**: `/Users/lxy/Desktop/lxy030988/react-template/dist`

## 浏览器验证

### 1. 验证HTTP/2

1. 访问 https://localhost/
2. 打开Chrome DevTools (F12) → Network标签
3. 查看Protocol列，应显示 **h2**
4. 检查Response Headers:
   - `x-protocol: HTTP/2.0`
   - `alt-svc: h3=":8443"; ma=86400`

### 2. 验证HTTP/3

1. 在Chrome中启用QUIC: `chrome://flags` → 搜索"QUIC" → 启用
2. 访问 https://localhost:8443/
3. Protocol列应显示 **h3** 或 **h3-29**

### 3. 验证缓存策略

**HTML文件**:
- 刷新页面时会重新请求（Status: 200 或 304）
- Response Headers: `cache-control: no-cache, must-revalidate`

**JS/CSS文件**:
- 第二次访问从缓存加载
- Size列显示 **(disk cache)** 或 **(memory cache)**
- Response Headers: `cache-control: public, max-age=31536000, immutable`

**图片文件**:
- Response Headers: `cache-control: public, max-age=2592000`

### 4. 验证ETag

1. 首次加载查看Response Headers，应包含 `etag: "xxx"`
2. 刷新页面查看Request Headers，应包含 `if-none-match: "xxx"`
3. 未修改的文件返回 **304 Not Modified**

## 故障排查

### 问题: 500 Internal Server Error

**原因**: Nginx worker进程无权限访问dist目录

**解决方案**:
```bash
# 为dist目录及父目录添加执行权限
chmod -R o+rX /Users/lxy/Desktop/lxy030988/react-template/dist
chmod o+x /Users/lxy/Desktop/lxy030988/react-template
chmod o+x /Users/lxy/Desktop/lxy030988
chmod o+x /Users/lxy/Desktop
chmod o+x /Users/lxy

# 重启nginx
sudo nginx -s reload
```

### 查看错误日志

```bash
# 实时查看错误日志
tail -f /opt/homebrew/var/log/nginx/error.log

# 查看访问日志
tail -f /opt/homebrew/var/log/nginx/access.log
```

### 端口被占用

```bash
# 检查端口占用
lsof -i :80
lsof -i :443
lsof -i :8443

# 杀掉占用进程
sudo kill -9 <PID>
```

## 测试命令

```bash
# 测试HTTP/2连接
curl -I https://localhost/ --insecure

# 查看完整响应头
curl -v https://localhost/ --insecure 2>&1 | grep -E "HTTP|cache-control|etag|alt-svc|x-protocol"

# 测试JS文件缓存
curl -I https://localhost/scripts/main.*.bundle.js --insecure

# 测试CSS文件缓存
curl -I https://localhost/styles/main.*.css --insecure
```

## 性能优化建议

### 已启用优化
- ✅ Gzip压缩（压缩级别6）
- ✅ HTTP/2多路复用
- ✅ 静态资源强缓存
- ✅ 文件访问日志关闭（静态资源）

### 可选优化
- 启用Brotli压缩（需要重新编译nginx）
- 配置CDN加速
- 启用HTTP/2 Server Push

## 开发工作流

### 修改项目代码后

```bash
# 1. 重新构建项目
npm run prod

# 2. 如遇权限问题，重新设置权限
chmod -R o+rX dist

# 3. 无需重启nginx，直接刷新浏览器即可
```

### 修改nginx配置后

```bash
# 1. 测试配置语法
nginx -t

# 2. 重新加载配置
sudo nginx -s reload
```

## 安全提示

⚠️ **自签名证书**: 当前使用的是自签名SSL证书，浏览器会显示安全警告。这仅适用于本地开发环境。

⚠️ **生产环境**: 生产环境请使用：
- Let's Encrypt等CA签发的正式证书
- 配置更严格的SSL/TLS设置
- 启用HSTS、CSP等安全头
- 调整缓存策略适应实际需求

## 相关资源

- [Nginx官方文档](https://nginx.org/en/docs/)
- [HTTP/2说明](https://developers.google.com/web/fundamentals/performance/http2)
- [HTTP/3介绍](https://www.chromium.org/quic)
- [HTTP缓存最佳实践](https://web.dev/http-cache/)

---

**最后更新**: 2025-12-31  
**Nginx版本**: 1.27.0  
**配置状态**: ✅ 已验证并正常工作
