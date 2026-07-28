# Miiiwa Portfolio — 作業指示書

学生エンジニア「Miiiwa」の個人ポートフォリオ。トップページは HTML ではなく Three.js で手続き的に生成したボクセル都市で、その上に通常の HTML で組んだ詳細ページを重ねるハイブリッド構成。`output: 'export'` の完全な静的サイトなので、サーバー機能（Route Handlers / Server Actions / ISR など）は使えない。

**応答もドキュメントも日本語で書く。** 英語にするのはコード内の識別子とコミットメッセージだけ。

## この Next.js は既知のものと違う

Next.js 16 には破壊的変更が入っている。API・規約・ファイル構成が学習データと食い違っている可能性がある。**Next.js に関わるコードを書く前に、必ず `node_modules/next/dist/docs/` の該当ガイドを読むこと。** バージョンに一致したドキュメントが同梱されており、そちらが正。非推奨の警告も無視しない。

## コマンド

```bash
npm run dev          # 開発サーバー (:3000)
npm run build        # 静的書き出し → out/
npm test             # Vitest 一回実行（1秒未満で終わる）
npm run test:watch
npm run lint
```

## 作業のたびに devlog を書く

`docs/devlog/YYYYMM.md` を**作業と同じターンで**更新する。あとでまとめて書かない。

- `## YYYY-MM-DD` 見出しの下に、テーマごとの `### ` 小見出しで追記する
- 日本語。既存のスタイル（太字のリード＋箇条書き）に合わせる
- **何をしたか**ではなく**なぜそうしたか**を書く。検討して却下した案も残す
- 計測値があれば必ず数字で入れる（変更前後のサイズ、リクエスト数、fps など）

git の履歴とは別に、これがプロジェクト自身の記録になっている。

## テスト方針

Vitest（node 環境）で、**React も three.js も含まない純粋ロジックだけ**をテストする。DOM もレンダラも要らないので全体が高速に回る。対象はカメラ座標計算・紙吹雪シミュレーション・決定論的ハッシュ・実績フィルタ・言語解決・URL 解釈など。

新しいテストは**変異テストで検証してから完了とする**。わざとバグを仕込んで落ちることを確認していないテストは、緑でも意味がない。

## 3D シーンを触るときの前提

詳細は [docs/tech.md](docs/tech.md) にある。壊しやすい不変条件だけ挙げる。

- **1モデル＝1ドローコール。** 街は `InstancedMesh` で数千ブロックを描いている。オブジェクトを増やすときもこの原則を崩さない
- **カメラの行き先を決める effect は `3d/Scene.tsx` に1つだけ。** 経路も3つだけ（エリアへ寄る / ホーム視点へ戻る / スクロールで全景へ）。ここを分散させない
- **座標計算は `3d/worldLayout.ts` に純粋関数として置き、テストする。** `camera-controls` の `fitToBox` は内部でカメラ角度を90°刻みに丸めるため、斜め俯瞰のこのシーンでは使えない
- **カードとカメラを相互に更新しない。** 正面のエリアは `facingSection()` が方位角から決め、カードはそれを読むだけ
- **マーカーとカードを結ぶ点線は React state を通さない。** 毎フレームの再レンダーを避けるため `3d/markerScreen.ts` の購読チャンネル経由で渡す
- **詳細ページがキャンバスを覆っている間は `frameloop="demand"`。** 省電力のためのこの切り替えを外さない

### 見た目を確認する方法

`curl` や一発の `chrome --screenshot` では**白いキャンバスしか撮れない**（WebGL の描画前に走るため。`--virtual-time-budget` は R3F の rAF ループのせいで永久にハングする）。スクラッチパッドに `puppeteer-core` を入れ、以下で撮る。

- `executablePath` に `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`、`headless: "new"`
- 起動引数 `--no-sandbox --enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`（ヘッドレスに GPU がないのでソフトウェア WebGL）
- `waitUntil: "networkidle2"` の後、描画されるまで **7秒ほど待ってから** `page.screenshot`
- `console` / `pageerror` を拾ってランタイムエラーを検出する
- 開発サーバーのスクショ左下に出る黒丸は Next.js の dev インジケーターであって、アプリの UI ではない

## ボクセルアセットの制作

Blockbench デスクトップアプリを MCP（`localhost:3001/bb-mcp`）経由で直接操作して作る。アプリが起動していないとツールは動かないので、`mcp__blockbench__*` が見つからないときは起動を確認してもらうこと。

- キューブは**すべて XYZ = 1,1,1**。1モデル内でサイズを混在させない
- ネイティブのブロック数は**1辺 10〜80 程度に収める**。実寸に比例させない（部屋でも 500 角にはしない）
- 実寸への到達は R3F 側の `scale` / `voxelSize` 倍率に任せる。見た目の統一感は、カテゴリごとに倍率の段を決めて一貫させることで担保する
- **GLB 書き出しに `export_model` は使えない**（gltf コーデックで空の `{}` を返すプラグインのバグ）。`risky_eval` から `Codecs.gltf.compile()` を await して `fs` で書く
- `create_cylinder` の `texture` 引数は効かない。生成後に `risky_eval` で各 face に texture の uuid を入れ直す

経緯と判断理由は [docs/voxel-object-creation.md](docs/voxel-object-creation.md) にまとまっている。

## 設定とスキルの置き場所

Claude Code 用の設定はすべて `.claude/` に集約している（`.agents/` と `AGENTS.md` は廃止済み）。

- `.claude/skills/hallmark/` — デザインスキル。新規ページ制作・リデザイン・UI 監査のときに `/hallmark` で呼ぶ
