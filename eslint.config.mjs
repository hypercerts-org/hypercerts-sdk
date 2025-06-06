export default  {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:chai-friendly/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "chai-friendly"],
  rules: {
    "no-unused-expressions": "off",
    "chai-friendly/no-unused-expressions": "error",
    "body-max-line-length":  [0, 'always'],
  },
};
