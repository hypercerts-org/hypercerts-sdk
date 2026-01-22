import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Shared ESLint base configuration for all packages.
 * Packages should import and extend this config.
 *
 * @example
 * // packages/sdk-core/eslint.config.mjs
 * import baseConfig from "../../eslint.config.mjs";
 * export default [
 *   ...baseConfig,
 *   { // package-specific overrides }
 * ];
 */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.rollup.cache/**", "**/coverage/**", "**/tmp/**"],
  },
];
