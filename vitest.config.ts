import { defineConfig, defaultExclude, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "./test/setup-env.ts",
    exclude: [...defaultExclude, "./lib/**/*"],
    coverage: {
      // you can include other reporters, but 'json-summary' is required, json is recommended
      reporter: ["text", "json-summary", "json"],
      // If you want a coverage reports even if your tests are failing, include the reportOnFailure option
      reportOnFailure: true,
      thresholds: {
        lines: 72,
        branches: 84,
        functions: 66,
        statements: 72,
      },
      include: ["src/**/*.ts"],
      exclude: [
        ...(configDefaults.coverage.exclude as string[]),
        "**/*.types.ts",
        "**/types.ts",
        "src/indexer/*.ts",
        "lib/*",
      ],
    },
  },
});
