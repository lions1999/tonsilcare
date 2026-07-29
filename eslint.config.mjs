import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefatti generati da next-pwa a ogni build (vedi .gitignore): sono
    // bundle minificati di workbox, lintarli produce solo rumore.
    "public/sw.js",
    "public/workbox-*.js",
    "public/fallback-*.js",
  ]),
]);

export default eslintConfig;
