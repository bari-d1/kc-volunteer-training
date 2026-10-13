import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * Mimics Next.js static image imports ({ src, width, height }) so
 * next/image works in tests. Reads PNG dimensions from the file header.
 */
function staticImages(): Plugin {
  return {
    name: "next-static-images",
    enforce: "pre",
    load(id) {
      const file = id.split("?")[0];
      if (!file.endsWith(".png")) return null;
      const header = readFileSync(file);
      const width = header.readUInt32BE(16);
      const height = header.readUInt32BE(20);
      const src = file.slice(file.indexOf("/src/"));
      return `export default ${JSON.stringify({ src, width, height })};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), staticImages()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next.js enforces server-only at build time; tests import freely.
      "server-only": fileURLToPath(
        new URL("./test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
