# 🚀 快速部署指南

## 方案一：GitHub Pages 部署（推荐）

### 前置条件
- 有 GitHub 账号
- 安装了 Git

### 部署步骤

1. **创建 GitHub 仓库**
   - 在 GitHub 上创建新仓库，名为 `devtools`（或其他名字）
   - 记下仓库的 HTTPS 地址

2. **初始化本地 Git**
   ```bash
   cd /home/zhihaopan/tools/app
   git init
   git config user.name "Your Name"
   git config user.email "your.email@example.com"
   git add .
   git commit -m "Initial commit: DevTools project"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/devtools.git
   git push -u origin main
   ```

3. **启用 GitHub Pages**
   - 访问你的仓库: https://github.com/YOUR_USERNAME/devtools
   - 点击 **Settings** → **Pages**
   - **Source** 选择 `main` 分支 → `/ (root)` 目录
   - 点击 **Save**
   - 等待部署完成（通常 1-2 分钟）

4. **访问你的站点**
   ```
   https://YOUR_USERNAME.github.io/devtools
   ```

   所有路由都支持：
   - https://YOUR_USERNAME.github.io/devtools/json-diff
   - https://YOUR_USERNAME.github.io/devtools/base64
   - 等等...

---

## 方案二：本地开发服务器

快速测试，无需 Docker：

### Python
```bash
cd /home/zhihaopan/tools/app

# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

### Node.js
```bash
cd /home/zhihaopan/tools/app
npx http-server -p 8080
```

### PHP
```bash
cd /home/zhihaopan/tools/app
php -S localhost:8080
```

然后访问：http://localhost:8080

---

## 方案三：其他静态托管服务

本项目也可以部署到：

### Vercel
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
cd /home/zhihaopan/tools/app
vercel
```

### Netlify
```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 部署
cd /home/zhihaopan/tools/app
netlify deploy --prod --dir=.
```

### 其他服务
- Surge.sh
- Firebase Hosting
- AWS S3 + CloudFront
- 任何支持静态文件托管的服务

---

## ⚠️ 重要说明

### 为什么要添加 404.html？
- GitHub Pages 会将 `/json-diff` 这样的路由当作文件来查找
- 找不到时返回 404，触发 `404.html`
- `404.html` 会重定向到 `index.html`，让前端路由接管

### 为什么要添加 .nojekyll？
- GitHub Pages 默认使用 Jekyll 构建
- `.nojekyll` 文件告诉 GitHub Pages 直接托管文件，不进行 Jekyll 处理

---

## 文件清单

已为您创建了以下部署相关文件：

✅ `.nojekyll` - GitHub Pages 配置
✅ `404.html` - 路由重定向
✅ `README.md` - 项目说明
✅ `.gitignore` - Git 忽略文件
✅ `.github/workflows/deploy.yml` - GitHub Actions（可选）

原有的 Docker 文件（Dockerfile、docker-compose.yml、nginx.conf）现在可以删除或忽略了。

---

## 测试路由

部署后，测试这些 URL：

| URL | 预期结果 |
|-----|---------|
| `/` | JSON 查看器 |
| `/json-diff` | JSON 对比 |
| `/base64` | Base64 编解码 |
| `/url-codec` | URL 编解码 |
| `/timestamp` | 时间戳转换 |
| `/nonexistent` | 重定向到首页 |

---

## 遇到问题？

### 404 错误
- 确保 `404.html` 文件存在于项目根目录
- 确保 GitHub Pages 已启用
- 等待 2-3 分钟让 GitHub 完成部署

### 路由不工作
- 清空浏览器缓存
- 检查 `js/app.js` 中的路由配置
- 确保资源路径正确

### 样式或脚本加载失败
- 检查浏览器开发者工具的 Network 选项卡
- 确保 HTML 中的 `<script>` 和 `<link>` 标签使用相对路径

---

祝部署顺利！ 🎉
