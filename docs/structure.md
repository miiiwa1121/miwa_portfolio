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
| `scene/` 直下のその他 | 層をまたぐもの（`sceneClock` / `markerBolt` / `sunLight` / `planetPlacement`）だけ。**迷ったらここではない** |

- **`camera/cameraLayout.ts` はカメラの構図、`planet/geometry.ts` は球面の幾何。** 旧称は `worldLayout.ts` / `planetLayout.ts` で、どちらも「Layout」だったせいで役割が名前から引けなかった（devlog 202607〜202608 の記述はこの旧称のまま）
- **同じ5エリアを指す語は `section` に統一してある。** `SectionCard`（旧 `AreaCard`）・`SectionMarkers`（旧 `AreaMarkers`）も含めて、コード内で `Area` は使わない（画面に出る日本語が「エリア」なのは別の話）。詳細ページの見出しコンテナは `detail/DetailSection.tsx` で、`SectionType` とは無関係
- **`SectionType` は `@/types` からだけ読む。** `AppStateContext` の再エクスポート経由という第2の経路は撤去済み。`OrbitZoom` も同じく `@/scene/camera/cameraLayout` が唯一の定義元
- **1ファイル1コンポーネントなら default export。** 複数を束ねるモジュール（`objects/Decorations.tsx` / `objects/ProceduralObjects.tsx`）だけが named
- **コンポーネント（PascalCase `.tsx`）とロジック（camelCase `.ts`）で、大文字小文字だけ違う名前を付けない。** macOS のファイルシステムは大文字小文字を区別しないので、`CardRail.tsx` と `cardRail.ts` を並べると TypeScript が `TS1149`（「すでに読み込んだファイルと大文字小文字しか違わない」）で止まる。ロジック側に別の名前を与える（`CardRail.tsx` ↔ `railLayout.ts`。既存の `SectionCard.tsx` ↔ `cardWheel.ts` も同じ形）
- **`public/` には「公開したいもの」しか置かない。** `output: 'export'` なので中身はそのまま配信される。git に残したいだけの制作物（`.bbmodel`／`.glb`）は `assets/` へ、試作 HTML は `docs/prototypes/` へ
