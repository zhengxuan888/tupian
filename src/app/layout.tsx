import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '择优臻选出海图片处理器',
  description: 'EXIF 批量写入 · AI 背景合成 · 去水印 — 所有处理在浏览器本地完成，不会上传任何文件。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {children}
      </body>
    </html>
  );
}
