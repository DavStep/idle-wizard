import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@figma-pixi/pixi-runtime": fileURLToPath(new URL("../packages/pixi-runtime/src/index.ts", import.meta.url)),
      "@figma-pixi/shared": fileURLToPath(new URL("../packages/shared/src/index.ts", import.meta.url))
    }
  },
  server: {
    open: false,
    hmr: {
      overlay: false
    }
  }
});
