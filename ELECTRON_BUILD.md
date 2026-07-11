# AI 图片处理器 - Electron 桌面应用打包指南

## 前置要求

- Node.js 18+ 和 pnpm
- Windows 10/11（打包 .exe）

## 快速打包步骤

### 1. 在本地电脑上克隆项目

```bash
git clone <你的仓库地址>
cd <项目目录>
pnpm install
```

### 2. 安装 Electron 依赖

```bash
pnpm add -D electron electron-builder tsx concurrently wait-on
```

### 3. 修改 next.config.ts

在 `next.config.ts` 中添加静态导出配置：

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // 添加这行：启用静态导出
  images: {
    unoptimized: true,  // 静态导出不支持图片优化
  },
};

export default nextConfig;
```

### 4. 编译 Electron 主进程

```bash
npx tsc -p electron/tsconfig.json
```

### 5. 构建 Next.js

```bash
pnpm build
```

这会生成 `out/` 目录，包含所有静态文件。

### 6. 打包 .exe

```bash
npx electron-builder --win --config electron-builder.json
```

打包完成后，安装包在 `release/` 目录下：
```
release/
└── AI 图片处理器 Setup x.x.x.exe
```

## 一键打包（可选）

```bash
bash scripts/build-electron.sh
```

## 开发模式

在开发模式下运行 Electron（热更新）：

```bash
# 终端 1：启动 Next.js 开发服务器
pnpm dev

# 终端 2：启动 Electron
npx electron .
```

## 注意事项

1. **图标格式**：Windows 安装包最好使用 `.ico` 格式图标，可以用在线工具将 `public/app-icon.jpg` 转换为 `.ico`
2. **签名**：如果要分发给其他用户，建议对 .exe 进行代码签名
3. **包体大小**：Electron 打包后约 150-200MB（包含 Chromium 运行时）
4. **离线功能**：
   - EXIF 批量写入：完全离线可用
   - 去水印：完全离线可用
   - AI 背景合成：需要网络连接（调用 AI 接口）

## 目录结构

```
├── electron/
│   ├── main.ts          # Electron 主进程
│   ├── preload.ts       # 预加载脚本（安全桥接）
│   └── tsconfig.json    # Electron TypeScript 配置
├── electron-builder.json # 打包配置
├── public/
│   └── app-icon.jpg     # 应用图标
├── scripts/
│   └── build-electron.sh # 打包脚本
└── src/                 # Next.js 源码
```

## 功能说明

### EXIF 批量写入
- 上传多张照片
- 配置多套参数（国家/手机/时间/备注）
- 100+ 个国家 GPS 坐标自动生成
- 30 款主流手机型号
- 导出：每个国家一个文件夹，带时间戳

### AI 背景合成
- AI 智能抠图（浏览器端 ONNX 模型）
- AI 背景生成（Pollinations AI 免费 / 自定义 API Key）
- 8 种预设背景 + 自定义描述
- 支持 OpenAI gpt-image-1 / dall-e-3 等模型

### 去水印
- 自动检测水印（边缘+亮度+纹理分析）
- 手动画笔标记
- 智能修复填充
- 灵敏度可调
