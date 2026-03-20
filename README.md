# 🛠 开发者工具箱

原生 HTML/JS 开发者工具集合，支持直接部署到 GitHub Pages。

## 功能特性

- 📋 **JSON 查看器** - 格式化、压缩、语法高亮
- 🔄 **JSON 对比** - 比较两个 JSON 文件的差异
- 🔐 **Base64 编解码** - 快速编码/解码
- 🌐 **URL 编解码** - URL 安全编码/解码
- ⏰ **时间戳转换** - Unix 时间戳与日期互转

## 本地运行

### 方式一：直接打开 HTML
```bash
# 简单方式：直接在浏览器中打开 index.html
open index.html
```

### 方式二：启动本地服务器
```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080

# Node.js
npx http-server -p 8080

# PHP
php -S localhost:8080
```

然后访问：http://localhost:8080

## 部署到 GitHub Pages

### 步骤 1: 创建 GitHub 仓库
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 步骤 2: 启用 GitHub Pages
1. 进入仓库的 **Settings**
2. 找到 **Pages** 选项
3. **Source** 选择 `main` 分支的 `/ (root)` 目录
4. 点击 **Save**

### 步骤 3: 访问您的站点
- 如果仓库名为 `devtools`，访问：https://YOUR_USERNAME.github.io/devtools
- 如果是用户主页仓库，访问：https://YOUR_USERNAME.github.io

## 路由说明

应用支持以下路由：

| 路由 | 功能 |
|------|------|
| `/` | JSON 查看器（默认） |
| `/json-viewer` | JSON 查看器 |
| `/json-diff` | JSON 对比 |
| `/base64` | Base64 编解码 |
| `/url-codec` | URL 编解码 |
| `/timestamp` | 时间戳转换 |

## 文件结构

```
├── index.html           # 主页面
├── 404.html             # GitHub Pages 路由重定向
├── .nojekyll            # 禁用 Jekyll 处理
├── css/
│   └── style.css        # 样式表
├── js/
│   ├── app.js           # 标签切换和路由
│   ├── json-viewer.js   # JSON 查看功能
│   ├── json-diff.js     # JSON 对比功能
│   ├── base64.js        # Base64 编解码
│   ├── url-codec.js     # URL 编解码
│   └── timestamp.js     # 时间戳转换
└── README.md            # 本文件
```

## 技术栈

- 原生 HTML5
- 原生 CSS3（无框架依赖）
- 原生 JavaScript（ES6+）
- 无任何第三方依赖

## 兼容性

支持所有现代浏览器：
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
