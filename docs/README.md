# docs 目次

miwa_portfolio のドキュメント一覧。作業のルールそのものは [CLAUDE.md](../CLAUDE.md) にあり、**ここには判断の理由・実測値・経緯**が置かれる。

## 作業前に読むもの

| ファイル | 中身 | いつ読むか |
| --- | --- | --- |
| [tech.md](tech.md) | 技術スタック、設計方針、アーキテクチャの要点 | 全体像を掴むとき、構成に関わる変更の前 |
| [scene-invariants.md](scene-invariants.md) | 3Dで壊しやすい箇所と、壊れる理由・実測値・却下した案 | **3Dシーンに触れる前（必読）** |
| [structure.md](structure.md) | ディレクトリ構成と命名の規約 | ファイルを追加・移動・改名する前 |
| [testing.md](testing.md) | テスト方針と、変異テストで得た教訓 | テストを書く前 |
| [verification.md](verification.md) | ヘッドレスでの見た目確認の手順と、計測の落とし穴 | スクリーンショットを撮る前、ピクセルで測る前 |
| [voxel-object-creation.md](voxel-object-creation.md) | Blockbench MCP でのボクセル制作フローと規約 | ボクセルアセットを作る前 |

## 台帳・記録

| ファイル | 中身 | 扱い |
| --- | --- | --- |
| [review.md](review.md) | 未修正の指摘の台帳（2026-08-02 の全体レビュー）。問題点＋解決策＋再現手順 | 直したら該当項目を消す。**新しい設計をここに書かない** |
| [devlog/](devlog/) | 日々の作業記録と判断の理由 | **毎回追記する。** あとから本文を書き換えない |
| [planet-migration.md](planet-migration.md) | 平面の浮遊島 → 球体の惑星への移行の記録（**完了済み**） | 通常は更新しない。現在の構造は `tech.md` と `scene-invariants.md` が正 |
| [prototypes/](prototypes/) | 本番に載せない試作物 | `public/` に置くと配信されてしまうものの退避先 |

## 書き分けの指針

- **ルール（何を守るか）は `CLAUDE.md`、理由（なぜそうなのか）は `docs/`。** `CLAUDE.md` は毎セッション読み込まれるので、肥大させると全作業のコストになる
- **恒久的な設計判断になったものは `review.md` から `tech.md` へ移す。** `review.md` は「まだ直っていないこと」だけを持つ
- **`devlog/` と `planet-migration.md` はその時点の記録。** 名前や構成が変わっても本文は書き換えない（リンク切れの修正は別）
