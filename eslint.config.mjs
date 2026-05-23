import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "_site/**",
      "node_modules/**",
      "vendor/**",
      ".jekyll-cache/**",
      "assets/pico8/**",
      "assets/js/pdf.mjs",
      "assets/js/pdf.worker.mjs",
    ],
  },

  js.configs.recommended,

  {
    files: ["assets/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },

  {
    files: ["*.config.js", "postcss.config.js", "tailwind.config.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },
];
