# 择优臻选出海图片处理器

专业的桌面图片处理工具，支持 EXIF 批量写入、AI 背景合成、去水印。

---

## 快速开始（3 步搞定）

### 第 1 步：安装 Python

1. 打开 https://www.python.org/downloads/
2. 点击黄色的 **Download Python 3.x.x** 按钮
3. 运行安装程序，**一定要勾选底部的 "Add Python to PATH"**
4. 点击 **Install Now**

![安装截图示意]
```
[x] Add Python to PATH    <-- 这个一定要勾上！
     Install Now
```

### 第 2 步：安装依赖

双击文件夹里的 **`setup.bat`**，等待自动安装完成。

或者打开 CMD（命令提示符），输入：
```
pip install PyQt5 piexif Pillow opencv-python-headless "numpy<2" requests
```

### 第 3 步：运行

双击 **`run.bat`**，或者在 CMD 中输入：
```
python main.py
```

---

## 功能介绍

### EXIF 批量写入
- 上传多张照片，配置多套国家/手机/时间参数
- 88 个国家 GPS 自动匹配，66 款手机型号
- 支持批量生成最多 200 套不同配置
- 按国家自动分文件夹输出
- 支持写入备注/UserComment

### AI 背景合成
- AI 智能抠图（需安装 rembg）
- 12 种预设背景 + 自定义文字描述生成
- 支持本地图片作为背景
- 一键下载合成结果

### 去水印
- 自动检测水印区域
- 画笔手动标记 + 智能修复填充
- 处理前后对比预览

---

## 系统要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10/11（64位） |
| Python | 3.10 或更高版本 |
| 内存 | 4GB 以上（AI 功能建议 8GB） |
| 硬盘 | 500MB 可用空间 |

---

## 常见问题

### Q: 双击 setup.bat 闪退？
A: 右键 setup.bat → 以管理员身份运行。或者打开 CMD 手动执行安装命令。

### Q: 提示 "python 不是内部或外部命令"？
A: Python 没安装好，或者安装时没勾选 "Add Python to PATH"。重新安装 Python，记得勾选。

### Q: AI 背景合成不能用？
A: 需要额外安装 rembg：`pip install rembg`。首次使用会自动下载 AI 模型（约 170MB）。

### Q: 打包成 EXE 分发给别人？
A: 安装 PyInstaller（`pip install pyinstaller`），然后双击 `build.bat`。打包后的文件在 `dist/择优臻选出海图片处理器/` 文件夹里。

### Q: 软件打不开 / 闪退？
A: 查看日志文件：`C:\Users\你的用户名\.ai_image_processor\logs\app.log`

---

## 文件说明

```
择优臻选出海图片处理器/
├── setup.bat          ← 双击安装依赖（第一次用必须运行）
├── run.bat            ← 双击启动软件
├── build.bat          ← 打包成 EXE（可选）
├── main.py            ← 程序入口
├── requirements.txt   ← 依赖列表
├── core/              ← 核心处理逻辑
├── data/              ← 国家/手机数据
├── ui/                ← 界面代码
└── assets/            ← 图标等资源
```

---

## 更新日志

### v2.0 (工业级)
- 88 个国家 + 66 款手机型号
- GPS 区域随机化（不再是固定坐标）
- AI 后台处理（不卡界面）
- 拖拽上传图片
- 配置自动保存
- 日志系统
- 菜单栏 + 快捷键

### v1.0
- EXIF 批量写入
- AI 背景合成
- 去水印
