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
    // 過去バージョンの静的書き出し（docs/structure.md の `public/archive/`）。
    // 中身は当時の Next.js が吐いたミニファイ済みのチャンクで、直すべき
    // ソースではない。除外しないと lint の結果が 4,890 件（うち error 35）に
    // 膨れ、**本物の指摘が埋もれる**。
    "public/archive/**",
  ]),
]);

export default eslintConfig;
