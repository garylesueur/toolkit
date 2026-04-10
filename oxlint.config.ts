import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: [
    "eslint",
    "typescript",
    "unicorn",
    "oxc",
    "react",
    "jsx-a11y",
    "nextjs",
  ],
  env: {
    builtin: true,
  },
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/.vercel/**",
    "**/coverage/**",
    "**/pnpm-lock.yaml",
    "**/*.min.js",
  ],
  rules: {
    "typescript/no-explicit-any": ["error", { fixToUnknown: true }],
    "react/react-in-jsx-scope": "off",
    "jsx-a11y/no-autofocus": "off",
  },
});
