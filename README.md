# 拂尘

浏览器里的 Windows / Mac 整理工作台。删除必须你确认，**不会静默自动删**。

## 怎么用

需要 [Node.js 20](https://nodejs.org/) 或以上。

```bash
git clone https://github.com/xuanske/fuchen.git
cd fuchen
npm install
npm run dev
```

终端会给出本地地址，用 **Chrome 或 Edge 桌面版** 打开。选 Downloads、Desktop 等文件夹后扫描。Safari / 手机浏览器没有文件夹授权，只能看演示扫描。

国内克隆可用：

```bash
git clone https://ghproxy.net/https://github.com/xuanske/fuchen.git
```

浏览器里的 Windows / Mac 整理工作台。

选 Downloads、Desktop 等文件夹后扫描重复文件和尘余，列出可回收体积。删除必须你确认，**不会静默自动删**。

系统级临时文件请用 Windows 自带的**存储感知**和**磁盘清理（含系统文件）**。拂尘负责你授权的用户文件夹：重复文件、安装包、缓存、陈旧压缩包。

## 能做什么

- Chrome / Edge 授权文件夹（File System Access API）
- 也可安装成 PWA，打开后再扫已授权的夹
- 同大小文件做 SHA-256 指纹，优先标 `文件 (1)` / 副本为可删，保留原件
- 演示扫描，不授权也能先看一遍流程
- 自动扫描可开，自动删除默认关
- 系统清单：存储感知、回收站、开机项、卸载残留（AppData 缓存）、微信、浏览器

## 不能做什么

这是网页工具，不能远程操作你的电脑，也不能在关掉窗口后后台删文件。不扫描 `Windows` / `Program Files`，不做注册表清洁。

## 源码

`src/components/fuchen` 界面，`src/lib/scan` 扫描与分类，`src/store/cleaner.ts` 状态。

需要较新的 Chromium 桌面浏览器。Safari / 手机浏览器没有文件夹授权。

姊妹项目：[筹算](https://github.com/xuanske/chousuan) · [开窍](https://github.com/xuanske/kaiqiao)
