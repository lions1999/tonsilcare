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
    // Un git worktree creato dentro .claude/worktrees/ e' una copia completa del
    // repo, con il suo .next/ e i suoi artefatti di build: senza questa riga
    // `npx eslint` dalla radice ne segnalava 32.751, di cui 32.750 in quella
    // copia. Il lint diventa inutilizzabile e il baseline vero (0 errori, 1
    // warning noto) sparisce nel rumore.
    ".claude/**",
  ]),
]);

export default eslintConfig;
