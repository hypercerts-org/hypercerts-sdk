import baseConfig from "../../eslint.config.mjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Lexicon package ESLint configuration.
 * Extends the shared base config with package-specific settings.
 */
export default [
  ...baseConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: path.resolve(__dirname, "./tsconfig.json"),
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    // Ignore generated files from lex-cli
    ignores: ["src/types/**", "src/lexicons.ts", "src/util.ts"],
  },
];
