# CLAUDE.md — miwa_portfolio 開発ガイド（Claude Code 用プロジェクト指示）

このリポジトリで作業する際の前提とルールを定義する。Claude Code はセッション開始時に本ファイルを自動で読み込む。

**判断の理由・実測値・経緯はここに書かない。** それらは `docs/` の担当で、ここは「何を守るか」だけを持つ。どの判断がどこにあるかは「作業前に読むもの」を参照。

## プロダクト

学生エンジニア「Miiiwa」の個人ポートフォリオ。トップページは HTML ではなく Three.js で手続き的に生成したボクセルの惑星で、その上に通常の HTML で組んだ詳細ページを重ねるハイブリッド構成。`output: 'export'` の完全な静的サイトなので、**サーバー機能（Route Handlers / Server Actions / ISR など）は使えない。**

## ミッション

1. **プロダクトの実装**
2. **docs の作成**

docs は実装の副産物ではなく、実装と同格の成果物として扱う。機能を実装したら、対応する docs の更新まで終えて「完了」とする。「あとでまとめて書く」はしない。

## 言語

**応答もドキュメントも日本語で書く。** 英語にするのはコード内の識別子とコミットメッセージだけ。

## 参照範囲

**このリポジトリ以外は参照しない。** `~/Desktop/dev/` 配下の他プロジェクトは miwa_portfolio とは無関係なサービスであり、設計や docs の根拠に使わないこと。

## この Next.js は既知のものと違う

Next.js 16 には破壊的変更が入っている。API・規約・ファイル構成が学習データと食い違っている可能性がある。**Next.js に関わるコードを書く前に、必ず `node_modules/next/dist/docs/` の該当ガイドを読むこと。** バージョンに一致したドキュメントが同梱されており、そちらが正。非推奨の警告も無視しない。

## 技術スタック

Next.js 16（App Router / `output: 'export'`）・React・TypeScript・Tailwind・framer-motion・Three.js + React Three Fiber + drei + camera-controls・Vitest。詳細と設計方針は [docs/tech.md](docs/tech.md)。

## コマンド

```bash
npm run dev          # 開発サーバー (:3000)
npm run build        # 静的書き出し → out/
npm test             # Vitest 一回実行（438件で1秒未満）
npm run test:watch
npm run lint
npx tsc --noEmit     # 型のみ検査（テストは .tsx を1つも通らないので必須）
```

## 作業前に読むもの

変更の種類ごとに、**コードを書く前に**該当 docs を読む。

| これから触るもの | 先に読む |
| --- | --- |
| 3Dシーン（カメラ・惑星・マーカー・光・About のクロール） | [docs/scene-invariants.md](docs/scene-invariants.md) ← **必読**。次いで [docs/tech.md](docs/tech.md) |
| スマホの挙動（判定・ジェスチャ・下部のカードレール） | [docs/scene-invariants.md](docs/scene-invariants.md) の「スマホ」節 ← **必読**。次いで [docs/tech.md](docs/tech.md) の「スマホは別の場面として組む」 |
| ファイルの追加・移動・改名 | [docs/structure.md](docs/structure.md) |
| テストの追加・変更 | [docs/testing.md](docs/testing.md) |
| 見た目の確認・ピクセル計測 | [docs/verification.md](docs/verification.md) |
| ボクセルアセットの制作 | [docs/voxel-object-creation.md](docs/voxel-object-creation.md) |
| 未修正の不具合の確認 | [docs/review.md](docs/review.md) |

docs 全体の地図は [docs/README.md](docs/README.md)。

## 守るべきこと

分野ごとの詳細は上表の docs にある。ここには**分野をまたいで効く原則**だけ置く。

- **不変条件を「直す」前に、それが意図的かを確かめる。** `docs/scene-invariants.md` の項目は**一度試して捨てた案とその実測値**を伴っている。バグに見えるものが判断の結果であることがあるので、消す前に理由を読む
- **却下済みの案を再提案しない。** 却下理由は docs に数字つきで残してある
- **値は参考写真・実測から導く。目測で置かない。** `reference/` の写真に合わせるときは、写真から一意に決まる式を書く
- **純粋ロジックは three.js / React を介さない純関数として切り出し、テストする。** 座標計算は `scene/camera/*.ts` と `scene/planet/*.ts` へ
- **同じ数を2箇所に持たない。** 片方だけ直る状態を作らない
- **無言で失敗する機構を足したら、機能したことを別途テストする**
- **スマホかどうかの判定は `src/state/useHandheld.ts` ただ1つ。** 2つ目の述語を作らない。PC 用の定数を「スマホで具合が悪い」という理由で書き換えず、スマホ用の定数を別に足す
- **`public/` には「公開したいもの」しか置かない。** `output: 'export'` なので中身はそのまま配信される。git に残したいだけの制作物は `assets/`、試作 HTML は `docs/prototypes/` へ

## docs のルール

### 1. devlog を残す

**随時**、`docs/devlog/` 直下へログを残す。

- ファイル名は `YYYYMM.md`（例: `docs/devlog/202609.md`）。同一月は同じファイルに**追記**し、`## YYYY-MM-DD` 見出しの下にテーマごとの `### ` 小見出しを足す
- **実装に限らない。** 要件・設計・調査・レビューなど、作業したら書く
- **何をしたか**ではなく**なぜそうしたか**を書く。検討して却下した案も残す
- 計測値があれば必ず数字で入れる（変更前後のサイズ、リクエスト数、fps など）
- 踏んだ罠と、その原因が何だったかも書く。同じところで詰まらないため
- 既存のスタイル（太字のリード＋箇条書き）に合わせる

### 2. ディレクトリには README を置く

`docs/` 内にディレクトリを作成するたび、そのディレクトリ直下に `README.md` を配置し、**目次**として使う。ディレクトリの中身を作る前に README を作る。

### 3. ファイル冒頭にタイトルを書く

すべてのファイルの先頭に、そのファイルが何のファイルなのかを示すタイトル（`# タイトル`）を書く。

### 4. 言語と粒度

docs は**日本語**で、実務レベル一式を揃える。

### 5. どのファイルに書くか

| ファイル | 何を書くか | 更新するタイミング |
| --- | --- | --- |
| `docs/devlog/YYYYMM.md` | 作業の記録と判断の理由 | **毎回**（例外なし） |
| `docs/tech.md` | 技術スタック、設計方針、アーキテクチャの要点 | 構成・依存・設計判断が変わったとき |
| `docs/scene-invariants.md` | 3Dで壊しやすい箇所と、壊れる理由・実測値・却下案 | 3Dの不変条件が増減したとき |
| `docs/structure.md` | ディレクトリ構成と命名の規約 | 配置・命名の規約が変わったとき |
| `docs/testing.md` | テスト方針と、変異テストで得た教訓 | テストの方針が変わったとき |
| `docs/verification.md` | ヘッドレスでの確認手順と計測の落とし穴 | 手順や罠が増えたとき |
| `docs/voxel-object-creation.md` | ボクセル制作のワークフローと規約 | 制作フローや規約を決め直したとき |
| `docs/review.md` | 未修正の指摘の台帳。問題点＋解決策＋再現手順 | 指摘を直したら該当項目を消す。恒久的な設計判断になったものは `tech.md` へ移す。**新しい設計をここに書かない** |
| `docs/planet-migration.md` | 惑星への移行の記録（**完了済み**） | 通常は更新しない |
| `README.md` | サイトの特長、起動手順、ディレクトリ構成 | ユーザーから見える機能や手順が変わったとき |
| `CLAUDE.md` | 作業の前提とルール | 守るべきルールが増減したとき。**理由や実測値はここではなく docs へ** |

devlog と `planet-migration.md` は**その時点の記録**なので、あとから本文を書き換えない（リンク切れの修正は別）。

## ボクセルアセットの制作

Blockbench デスクトップアプリを MCP（`localhost:3001/bb-mcp`）経由で直接操作して作る。アプリが起動していないとツールは動かないので、`mcp__blockbench__*` が見つからないときは起動を確認してもらうこと。

- キューブは**すべて XYZ = 1,1,1**。1モデル内でサイズを混在させない
- ネイティブのブロック数は**1辺 10〜80 程度に収める**。実寸に比例させない
- 実寸への到達は R3F 側の `scale` / `voxelSize` 倍率に任せる

既知のツールのバグと回避策、経緯は [docs/voxel-object-creation.md](docs/voxel-object-creation.md)。

## 設定とスキルの置き場所

Claude Code 用の設定はすべて `.claude/` に集約している（`.agents/` と `AGENTS.md` は廃止済み）。

- `.claude/skills/hallmark/` — デザインスキル。新規ページ制作・リデザイン・UI 監査のときに `/hallmark` で呼ぶ
