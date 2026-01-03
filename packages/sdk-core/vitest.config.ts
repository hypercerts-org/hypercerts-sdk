import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    environment: "node",
    reporters: [["default", { summary: false }]],
    silent: true,
    outputFile: {
      json: "./test-results.json",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.config.*",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.d.ts",
        ".rollup.cache/",
        "src/testing/**",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
