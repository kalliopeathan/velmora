import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror tsconfig's "@/*" path alias, which Vitest doesn't read on its own.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
