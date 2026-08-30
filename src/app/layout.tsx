import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AntdProvider } from "@/components/antd-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOTILAI Chat",
  description: "MOTILAI 多模态 AI 对话工作台",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body><AntdRegistry><AntdProvider>{children}</AntdProvider></AntdRegistry></body>
    </html>
  );
}
