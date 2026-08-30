"use client";

import { App as AntdApp, ConfigProvider } from "antd";
import type { ReactNode } from "react";

export function AntdProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider theme={{ token: { colorPrimary: "#0f8f68", borderRadius: 6, fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif' } }}><AntdApp>{children}</AntdApp></ConfigProvider>;
}
