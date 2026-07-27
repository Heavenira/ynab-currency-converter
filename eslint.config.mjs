import { defineConfig } from "eslint/config";
import globals from "globals";
import pluginJs from "@eslint/js";
import plguinCss from "@eslint/css";
import pluginJson from "@eslint/json";
import tseslint from "typescript-eslint";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/package-lock.json"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    extends: [
      pluginJs.configs.recommended,
      tseslint.configs.recommended,
      prettierConfig,
    ],
  },
  {
    files: ["**/*.css"],
    language: "css/css",
    plugins: {
      css: plguinCss,
      prettier: prettierPlugin,
    },
    extends: ["css/recommended"],
    rules: {
      "prettier/prettier": "warn",
    },
  },
  {
    files: ["**/*.json"],
    language: "json/json",
    plugins: {
      json: pluginJson,
      prettier: prettierPlugin,
    },
    extends: ["json/recommended"],
    rules: {
      "prettier/prettier": "warn",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      eqeqeq: ["error", "always"],
      "prefer-destructuring": [
        "error",
        {
          VariableDeclarator: {
            array: false,
            object: true,
          },
          AssignmentExpression: {
            array: false,
            object: false,
          },
        },
        {
          enforceForRenamedProperties: false,
        },
      ],
      //"no-console": "warn",
      //"no-alert": "error",
    },
  },
  {
    files: ["scripts/**"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
]);
