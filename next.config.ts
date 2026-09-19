import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  output: 'export',
  // 開発時のみ出るルート表示を切っている。**見た目の好みではなく、操作を
  // 奪うため。** 390px 幅で `#devtools-indicator` は [334,20,36,36] に出て、
  // ヘッダー右端のメニュー／閉じるボタン [318,28,44,44] に重なる——
  // `document.elementFromPoint` がボタンではなく `NEXTJS-PORTAL` を返し、
  // **ボタンが押せなくなる**（実測）。
  //
  // `devIndicators: { position: ... }` では動かせなかった。スキーマは4つの
  // 位置を受け付け、既定値は既に 'bottom-left' なのに、実際の描画は右上の
  // ままだった（Next 16.2.10 で確認）。本番ビルドにはそもそも存在しない
  // ものなので、配信物には影響しない。コンパイルエラーとランタイムエラーの
  // 表示は false にしても残る。
  devIndicators: false,
  images: {
    unoptimized: true, // 静的書き出し時には必須
  },
};

// 制作実績の個別ページと note の本文は `src/content/` の MDX。ページとして
// ではなく `import()` で読むので `pageExtensions` は足していない（ルートは
// 従来どおり .tsx だけ）。プラグインを関数ではなく**名前の文字列**で渡すのは
// Turbopack の制約——関数は Rust 側へ渡せない（同梱ドキュメント
// `01-app/02-guides/mdx.md` の「Using Plugins with Turbopack」）。
// remark-gfm は表（実測値の比較）と取り消し線のため。
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
