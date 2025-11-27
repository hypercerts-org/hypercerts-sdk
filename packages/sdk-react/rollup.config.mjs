import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const external = [
  "react",
  "react/jsx-runtime",
  "@tanstack/react-query",
  "@hypercerts-org/sdk-core",
  "@hypercerts-org/sdk-core/errors",
  "@hypercerts-org/sdk-core/types",
];

/** @type {import('rollup').RollupOptions[]} */
export default [
  // Main bundle (ESM)
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.mjs",
      format: "esm",
      sourcemap: true,
    },
    external,
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
      }),
    ],
  },
  // Main bundle (CJS)
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.cjs",
      format: "cjs",
      sourcemap: true,
    },
    external,
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
      }),
    ],
  },
  // Main types
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "esm",
    },
    external,
    plugins: [dts()],
  },
  // Testing bundle (ESM)
  {
    input: "src/testing/index.ts",
    output: {
      file: "dist/testing.mjs",
      format: "esm",
      sourcemap: true,
    },
    external,
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
      }),
    ],
  },
  // Testing bundle (CJS)
  {
    input: "src/testing/index.ts",
    output: {
      file: "dist/testing.cjs",
      format: "cjs",
      sourcemap: true,
    },
    external,
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
      }),
    ],
  },
  // Testing types
  {
    input: "src/testing/index.ts",
    output: {
      file: "dist/testing.d.ts",
      format: "esm",
    },
    external,
    plugins: [dts()],
  },
];
