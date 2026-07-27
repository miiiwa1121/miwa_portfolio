import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Everything under test is pure logic deliberately kept free of React and
    // three.js, so there is no need to pay for a DOM.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
