# ディレクトリ構成の規約

2026-09-11 のファイル構成レビューで決めた配置と命名の規約。人間向けのツリーは [README.md](../README.md) の「ディレクトリ構成」にある。

`src/` は**画面上の役割**で切る。`components/` のような実装手段での分類はしない。`scene/` の中はさらに3つに割れていて、**新しいファイルはこのどれかに入れる**（直下に足さない）。

| 置き場 | 何が入るか |
| --- | --- |
| `scene/Scene.tsx` | キャンバスとカメラの制御。**行き先を決める effect はここ1つだけ**（[scene-invariants.md](scene-invariants.md) の「カメラ — 行き先と飛行」） |
| `scene/camera/` | 構図・飛行・画面への射影（`cameraLayout` / `cameraFlight` / `markerScreen`）。three.js を持ち込まない |
| `scene/objects/` | シーンに置かれる R3F コンポーネント。`PlanetScene.tsx` がその根 |
| `scene/planet/` | 球面の幾何と配置の純粋関数（`geometry` / `sections` / `tour` / `shell` / `city` / `decor`） |
| `scene/voxel/` | ボクセルエンジン |
| `scene/` 直下のその他 | 層をまたぐもの（`sceneClock` / `markerBolt` / `sunLight` / `planetPlacement`）と、入力の交通整理（`pointerClaim` / `viewGesture`）だけ。**迷ったらここではない** |

- **`camera/cameraLayout.ts` はカメラの構図、`planet/geometry.ts` は球面の幾何。** 旧称は `worldLayout.ts` / `planetLayout.ts` で、どちらも「Layout」だったせいで役割が名前から引けなかった（devlog 202607〜202608 の記述はこの旧称のまま）
- **同じ5エリアを指す語は `section` に統一してある。** `SectionCard`（旧 `AreaCard`）・`SectionMarkers`（旧 `AreaMarkers`）も含めて、コード内で `Area` は使わない（画面に出る日本語が「エリア」なのは別の話）。詳細ページの見出しコンテナは `detail/DetailSection.tsx` で、`SectionType` とは無関係
- **`SectionType` は `@/types` からだけ読む。** `AppStateContext` の再エクスポート経由という第2の経路は撤去済み。`OrbitZoom` も同じく `@/scene/camera/cameraLayout` が唯一の定義元
- **1ファイル1コンポーネントなら default export。** 複数を束ねるモジュール（`objects/Decorations.tsx` / `objects/ProceduralObjects.tsx`）だけが named
- **コンポーネント（PascalCase `.tsx`）とロジック（camelCase `.ts`）で、大文字小文字だけ違う名前を付けない。** macOS のファイルシステムは大文字小文字を区別しないので、`CardRail.tsx` と `cardRail.ts` を並べると TypeScript が `TS1149`（「すでに読み込んだファイルと大文字小文字しか違わない」）で止まる。ロジック側に別の名前を与える（`CardRail.tsx` ↔ `railLayout.ts`。既存の `SectionCard.tsx` ↔ `cardWheel.ts` も同じ形）
- **`public/` には「公開したいもの」しか置かない。** `output: 'export'` なので中身はそのまま配信される。git に残したいだけの制作物（`.bbmodel`／`.glb`）は `assets/` へ、試作 HTML は `docs/prototypes/` へ

## `public/archive/` — 過去バージョンの保存庫

制作実績で「ポートフォリオ自身の沿革」を見せるために、**過去バージョンの静的書き出しを丸ごと** `public/archive/vN/` に置く。訪問者が当時の動く画面をそのまま触れるようにするためで、スクリーンショットではなくビルド成果物そのもの。**`public/` 直下の例外ではなく、上の規約どおり「公開したいもの」に該当する**（試作物の退避先である `docs/prototypes/` とは目的が違う）。

| パス | 中身 | タグ |
| --- | --- | --- |
| `public/archive/v1/` | ボクセルの惑星。平面の浮遊島から球体へ移行し、5ランドマーク・雑居ビル・プラザ装飾すべてをボクセルで構築していた時代 | `v1-voxel-planet` |

### 次のバージョンを保存する手順

**節目のコードが動くうちにビルドすること。** 何ヶ月も経ってから古いコミットを掘り起こすと、依存パッケージが今の Node/npm では素直に入らなくなっている可能性がある。v1 を保存したのも、ボクセル表現を撤退する決定の直後——まだ確実にビルドが通るうちに、という判断だった。

1. 節目のコミットにタグを打つ（`git tag -a vN-<名前> <commit> -m "..."`）
2. そのタグを `git worktree add` で別ディレクトリへ取り出す（作業中のツリーを汚さないため）
3. 取り出した先の `next.config.ts` に **`basePath: '/archive/vN'` と `assetPrefix: '/archive/vN'` を足す**。これが無いと、書き出された HTML が `/_next/...` を**サイトのルート基準**で参照してしまい、**現行サイトのチャンクを読みに行って壊れる**（絶対パスはファイルの置かれたディレクトリではなくドメイン直下に解決されるため、iframe に入れても同じ）。この変更はコミットしない
4. `npm install && npm run build` して `out/` を得る
5. `out/` の中身を `public/archive/vN/` へコピーし、`.DS_Store` を除いてコミット
6. worktree を削除する（`git worktree remove`）

`basePath` が効いたかは、書き出した `index.html` の `src=`／`href=` が全部 `/archive/vN/` で始まっているかで確認できる（外部ドメインへのリンクは当然そのまま）。**`node_modules` をシンボリックリンクで共有しようとすると Turbopack が `Symlink ... points out of the filesystem root` で落ちる**ので、worktree 側で素直に `npm install` する。
