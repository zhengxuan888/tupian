#!/bin/bash
# AI 图片处理器 - Electron 打包脚本
# 在你的本地电脑上运行此脚本

set -e

echo "=== AI 图片处理器 - Electron 打包 ==="
echo ""

# 1. 安装依赖
echo "[1/5] 安装依赖..."
pnpm install
pnpm add -D electron electron-builder tsx concurrently wait-on

# 2. 编译 Electron 主进程
echo "[2/5] 编译 Electron 主进程..."
npx tsc -p electron/tsconfig.json

# 3. 构建 Next.js 静态导出
echo "[3/5] 构建 Next.js 静态导出..."
# 需要在 next.config.ts 中添加 output: 'export'
pnpm build

# 4. 打包 Electron 应用
echo "[4/5] 打包 Electron 应用..."
npx electron-builder --win --config electron-builder.json

# 5. 完成
echo "[5/5] 打包完成！"
echo ""
echo "输出目录: ./release/"
echo "安装包位置: ./release/AI 图片处理器 Setup x.x.x.exe"
echo ""
echo "=== 打包完成 ==="
