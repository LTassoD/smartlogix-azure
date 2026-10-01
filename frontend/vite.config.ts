import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const DEV_PROXY_PREFIX = "/__smartlogix_api";

export default defineConfig(({ mode }) => {
  const viteEnv = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = viteEnv.VITE_API_BASE_URL || "http://localhost:8080";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url))
      }
    },
    server: {
      port: 5173,
      proxy: {
        [DEV_PROXY_PREFIX]: {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(new RegExp(`^${DEV_PROXY_PREFIX}`), "")
        }
      }
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true
    }
  };
});
