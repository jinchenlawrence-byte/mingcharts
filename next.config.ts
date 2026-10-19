import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ★ web-push 走 Node 原生 https/加密模块：声明为外部包，避免被打包（Next 16 / Turbopack）
  serverExternalPackages: ["web-push"],
  async headers() {
    return [
      {
        // ★ Service Worker 必须每次校验更新，绝不长缓存
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
