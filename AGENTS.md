# AGENTS.md

## 项目概览

AI 图片处理器 — 一个 Web 端图片处理工具，包含三大核心功能：
1. **EXIF 批量写入器**：支持上传多张照片，配置多套国家/手机/时间参数，批量写入 EXIF 信息并以 ZIP 格式导出
2. **AI 背景合成**：上传照片，AI 自动抠图 + 生成新背景 + 合成，完全免费
3. **去水印**：画笔标记水印区域，自动修复填充，完全免费

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **EXIF 处理**: piexifjs (客户端 JPEG EXIF 读写)
- **ZIP 生成**: jszip (客户端 ZIP 打包)
- **AI 抠图**: @imgly/background-removal (客户端 ONNX/WASM AI 模型)
- **AI 背景生成**: Pollinations AI (免费图像生成 API，无需 Key)

## 目录结构

```
src/
├── app/
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 主页面（Tab 布局：EXIF + AI背景）
│   └── globals.css         # 全局样式
├── components/
│   ├── ui/                 # shadcn/ui 组件库
│   └── ai-background.tsx   # AI 背景合成组件
│   └── watermark-removal.tsx # 去水印组件
├── lib/
│   ├── utils.ts            # 通用工具 (cn)
│   ├── phones.ts           # 30 款手机型号数据
│   ├── countries.ts        # 100+ 个国家 GPS 坐标数据（含国旗）
│   ├── exif-utils.ts       # EXIF 写入核心逻辑
│   └── zip-utils.ts        # ZIP 打包与下载
└── types/
    └── piexifjs.d.ts       # piexifjs 类型声明
```

## 开发命令

- `pnpm dev` — 启动开发服务器
- `pnpm build` — 构建生产版本
- `pnpm start` — 启动生产服务器
- `pnpm ts-check` — TypeScript 类型检查
- `pnpm lint` — ESLint 检查

## 核心功能

### EXIF 批量写入
1. **照片上传** — 拖拽/点击上传，支持多张，缩略图预览
2. **国家快捷选择** — 按区域分组（欧洲/亚洲/美洲/大洋洲/中东非洲），国旗显示，搜索过滤
3. **批量生成** — 支持一键生成 200 套配置（随机国家/手机/时间）
4. **多套配置** — 每套包含国家(自动GPS)、手机型号、拍摄时间（最近3个月随机）
5. **EXIF 写入** — 客户端处理，写入 Make/Model/DateTime/GPS 等
6. **ZIP 导出** — 按国家分文件夹打包下载

### AI 背景合成
1. **上传照片** — 拖拽/点击上传
2. **AI 抠图** — 使用 @imgly/background-removal 在浏览器端智能抠图
3. **背景生成** — 通过 Pollinations AI 根据文字描述生成新背景
4. **自动合成** — Canvas 合成前景+新背景
5. **预设背景** — 8 种常用背景一键选择（海滩、城市、森林等）
6. **下载结果** — 一键下载合成后的图片

### 去水印
1. **上传图片** — 拖拽/点击上传带水印的图片
2. **画笔标记** — 用可调大小的画笔涂抹水印区域（红色标记）
3. **智能修复** — 多遍算法自动用周围像素填充修复标记区域
4. **下载结果** — 一键下载去除水印后的图片

## Python 桌面版

位于 `python-desktop/` 目录，使用 Python + PyQt5 实现的桌面应用：

### 技术栈
- **GUI**: PyQt5
- **EXIF**: piexif
- **图片处理**: Pillow, opencv-python-headless
- **AI 抠图**: rembg（可选）
- **AI 背景**: Pollinations AI (requests)
- **打包**: PyInstaller

### 运行命令
- `python main.py` — 启动桌面应用
- `build.bat` — Windows 打包成 EXE

### 目录结构
```
python-desktop/
├── main.py              # 入口（含依赖检查 + 日志）
├── core/                # 核心逻辑
│   ├── exif_writer.py   # EXIF 批量写入（含 JPEG 验证）
│   ├── ai_background.py # AI 背景合成（含网络重试）
│   └── watermark.py     # 去水印（支持中文路径）
├── data/                # 数据
│   ├── countries.py     # 35 个国家（GPS 坐标）
│   └── phones.py        # 26 款手机型号
└── ui/
    └── main_window.py   # 主窗口（多线程 + 依赖检查）
```

### 已修复的问题
1. Windows 中文路径（cv2.imread 改用 np.fromfile）
2. UI 卡死（AI 合成改用 QThread）
3. Pillow/OpenCV 版本兼容
4. 非 JPEG 文件验证
5. 网络请求自动重试
6. GPS 坐标溢出保护
7. 启动依赖检查
8. 日志记录

## 注意事项

- 所有图片处理在浏览器端完成，不上传服务器
- EXIF 写入仅支持 JPEG 格式（piexifjs 限制）
- AI 抠图首次使用需下载 ONNX 模型（约 40MB）
- AI 背景生成依赖 Pollinations AI 免费服务，需要网络连接
