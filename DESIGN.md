# DESIGN.md

## 项目与用户画像
- 工具型 Web 应用：AI 图片处理器（EXIF 批量写入 + AI 背景合成 + 去水印）
- 用户需要高效、清晰地配置多套参数并批量处理图片
- 核心体验：步骤清晰、操作直观、反馈即时、视觉精致

## 品牌与视觉方向
- 气质：高端精致，专业工具感，现代简约
- 风格：毛玻璃质感 + 微渐变 + 精致阴影，类似 Apple/Linear 的设计语言
- 参考：Apple Human Interface Guidelines, Linear App, Vercel Dashboard

## Design Tokens

### 色彩
- 页面背景：渐变 `linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #fef3f2 100%)`
- 卡片背景：白色半透明 `rgba(255, 255, 255, 0.8)` + 毛玻璃效果
- 主文字：深色 `#1a1a2e`
- 辅助文字：中灰 `#6b7280`
- 主色调：渐变蓝紫 `linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)`
- 成功：渐变绿 `linear-gradient(135deg, #10b981 0%, #34d399 100%)`
- 错误/删除：渐变红 `linear-gradient(135deg, #ef4444 0%, #f87171 100%)`
- 边框：半透明 `rgba(0, 0, 0, 0.06)`

### 字体
- 字体族：'Inter', 'PingFang SC', -apple-system, system-ui
- 标题：20-24px, font-weight 700, letter-spacing -0.02em
- 正文/标签：14px, font-weight 500
- 辅助说明：12-13px, text-muted-foreground

### 间距与圆角
- 卡片圆角：16px（rounded-2xl）
- 按钮/输入框圆角：10px（rounded-[10px]）
- 卡片内边距：24px（p-6）
- 模块间距：20px

### 阴影
- 卡片：`0 4px 24px -4px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)`
- 悬停：`0 8px 32px -4px rgba(0, 0, 0, 0.12)`
- 按钮：`0 2px 8px -2px rgba(99, 102, 241, 0.4)`

### 动效
- 过渡：`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
- 悬停：`transform: translateY(-1px)`
- 按下：`transform: scale(0.98)`

## 布局与响应式
- 最大宽度 1200px 居中
- 配置卡片网格：大屏 2 列，小屏 1 列
- 步骤式纵向布局：上传 → 配置 → 生成

## 交互与状态
- 拖拽区域：虚线边框，拖入时边框变主色 + 背景微亮
- 按钮悬停：轻微上移 + 阴影加深 + 渐变微亮
- 处理中：进度条 + 禁用操作按钮 + 微旋转加载图标
- 空状态：灰色提示文字引导用户操作

## 设计禁忌
- 不要使用纯灰色按钮，用渐变或微妙的色彩
- 不要使用生硬的直角，保持圆润
- 不要使用过重的阴影，保持轻盈
- 不要使用超过 300ms 的动画
