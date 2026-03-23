// vitest.config.js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.js"],
    env: {
      JWT_SECRET: "test-secret",
    },
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.js"],
      exclude: ["src/index.js", "src/swagger/**"],
    },
  },
});
