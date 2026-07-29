# Miiiwa Portfolio — 作業指示書

学生エンジニア「Miiiwa」の個人ポートフォリオ。トップページは HTML ではなく Three.js で手続き的に生成したボクセル都市で、その上に通常の HTML で組んだ詳細ページを重ねるハイブリッド構成。`output: 'export'` の完全な静的サイトなので、サーバー機能（Route Handlers / Server Actions / ISR など）は使えない。

**応答もドキュメントも日本語で書く。** 英語にするのはコード内の識別子とコミットメッセージだけ。

## あなたの役割

**プロダクトの開発と、docs の作成の両方を担う。** コードを書いて終わりではなく、その変更が `docs/` に反映されているところまでが1つの作業。「あとでまとめて書く」はしない。**都度更新する。**

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

## docs は都度更新する

コードを変更したら、**同じターンのうちに**該当する docs を更新する。どれを触るかは変更の中身で決める。

| ファイル | 何を書くか | 更新するタイミング |
| --- | --- | --- |
| `docs/devlog/YYYYMM.md` | 作業の記録と判断の理由 | **毎回**（例外なし） |
| `docs/tech.md` | 技術スタック、設計方針、アーキテクチャの要点 | 構成・依存・設計判断が変わったとき |
| `docs/voxel-object-creation.md` | ボクセル制作のワークフローと規約 | 制作フローや規約を決め直したとき |
| `README.md` | サイトの特長、起動手順、ディレクトリ構成 | ユーザーから見える機能や手順が変わったとき |
| `CLAUDE.md` | 作業の前提とルール | 守るべき不変条件やルールが増減したとき |

### devlog の書き方

`docs/devlog/YYYYMM.md` は git の履歴とは別の、プロジェクト自身の記録。あとでまとめて書かない。

- `## YYYY-MM-DD` 見出しの下に、テーマごとの `### ` 小見出しで追記する
- 日本語。既存のスタイル（太字のリード＋箇条書き）に合わせる
- **何をしたか**ではなく**なぜそうしたか**を書く。検討して却下した案も残す
- 計測値があれば必ず数字で入れる（変更前後のサイズ、リクエスト数、fps など）
- 踏んだ罠と、その原因が何だったかも書く。同じところで詰まらないため

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
- **マーカーの大きさは画面 px で決め、ワールド scale を毎フレーム逆算する（`markerScaleForScreenRadius()`）。** 逆はできない。スプライトはビュー空間で頂点をずらすビルボードなので、ワールド空間のベクトルを射影しても画面サイズにはならない
- **`useFrame` の中でカメラの行列を読む前に `camera.updateMatrixWorld()` を呼ぶ。** `camera-controls` は毎フレーム `position` / `quaternion` しか書かず、行列を張り直すのは `gl.render()` の中。これを飛ばすと `.project()` が前フレームのカメラで射影し、DOM 側だけ1フレーム遅れる（回転方向で符号が反転するズレになる）
- **自分から動くものは `3d/sceneClock.ts` から時刻を読む。** `state.clock.elapsedTime` や生の `delta` を直接使うと、停止ボタンで止まらないオブジェクトが1つだけ残る
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
