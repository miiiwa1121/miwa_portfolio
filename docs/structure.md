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
- **`public/` には「公開したいもの」しか置かない。** `output: 'export'` なので中身はそのまま配信される。git に残したいだけの制作物（`.bbmodel`／`.glb`）は `assets/` へ、試作 HTML は `sandbox/` へ
- **`sandbox/` は動く試作物、`docs/` は書かれた記録。** 2026-09-16 に `docs/prototypes/` から移した——`docs/` は「判断の理由・実測値・経緯」を持つ場所で、単体で動く HTML はその種類ではない。ルート直下の `assets/`（`.bbmodel`／`.glb`）・`reference/`（ムード参考、gitignore）と同じ「公開しないが git に残す成果物」の並びに置いている。**`test/` や `tests/` という名前は避けた**——`src/**/*.test.ts` の Vitest 一式と紛らわしく、新しく入った人がまずそこを探すため

## 読み物のページ（2026-09-19）

`scene/` の外、ジオラマを持たない普通の HTML のページ群の置き場。設計の理由は [tech.md](tech.md) の「読み物のページ」。

| 置き場 | 何が入るか |
| --- | --- |
| `app/(reading)/` | ルートグループ。`layout.tsx`（共通のヘッダー・フッター）と `products/`・`notes/` の一覧と個別ページ。**グループ名は URL に出ない** |
| `reading/` | 読み物のページだけが使う部品（`ReadingHeader`／`ReadingFooter`／`ReadingDock`／`BackLink`／`ProductActions`／`ProductList`／`NoteList`）と、メタデータの組み立て（`pageMeta.ts`） |
| `content/products/<slug>.mdx` | 制作実績の本文。**`data/projects.ts` の全 slug に1つずつ**（テストが両方向の過不足を見る） |
| `content/notes/<slug>.mdx` | ノートの本文。事実（題・日付・要約）は `data/notes.ts` 側に書き、MDX には `#` の見出しを書かない |
| `mdx-components.tsx` | MDX の本文の型。`@next/mdx` が `app/` と同じ階層を要求するので `src/` 直下に置く（ここだけ `src/` 直下のファイル） |
| `data/site.ts` | サイトの URL と AdSense の発行者 ID。`https://miiiwa.com` を直書きしない |

- **ハブと共有する部品は、ハブ側の置き場に置いたまま読み物から import する。** `reading/` にコピーを作らない（見た目をハブに揃えるのが目的で、コピーは片方だけ直る状態を作る）。ナビは `hub/nav.ts`・`hub/NavPills.tsx`・`hub/MobileMenu.tsx`、見出しは `detail/SectionHeading.tsx`、公開状態とカテゴリのバッジは `detail/products/Badges.tsx`。どちらの持ち物でもないロゴだけ `ui/Wordmark.tsx`。これらは `"use client"` もフックも持たないか（`NavPills`・`SectionHeading`・`Badges`・`Wordmark`）、持っていても読み物側がクライアント部品の中から使う（`MobileMenu` は `ReadingHeader` の中）
- **テスト専用のヘルパーは `*.testutil.ts` と名付ける**（`content/contentFiles.testutil.ts`）。Vitest の `include` は `*.test.ts` なので実行されず、名前でアプリから import してはいけないことが分かる。ディスクを読むのでアプリ側に入れてはいけない
- **ノートとプロダクトの slug は URL になる**ので、英小文字・数字・ハイフンだけ。Michaw の slug は旧名の `mesen` から `michaw` に改めた（個別ページの URL を公開する前に。経歴の2件の紐づけも追従）

## `public/archive/` — 過去バージョンの保存庫

制作実績で「ポートフォリオ自身の沿革」を見せるために、**過去バージョンの静的書き出しをそのまま** `public/archive/vN/` に置く（手を入れるのは、下の手順6〜8の「画像のパス」「検索よけ」「どこからも参照されないファイルの削除」だけ）。訪問者が当時の動く画面をそのまま触れるようにするためで、スクリーンショットではなくビルド成果物そのもの。**`public/` 直下の例外ではなく、上の規約どおり「公開したいもの」に該当する**（試作物の退避先である `sandbox/` とは目的が違う）。

| パス | 中身 | タグ（元のコミット） | 公開していた期間 |
| --- | --- | --- | --- |
| `public/archive/v0/` | ダーク／ネオンの1ページ HTML サイト。黒地にネオンのグラデーション、カーソルから逃げて長押しで集まるパーティクル、縦スクロールで Hero → About → Products → Skills → Experience → Contact | `v0-dark-neon`（`ed4e3cb`） | 2026-07-13 〜 09-09 |
| `public/archive/v1/` | ボクセルの惑星。平面の浮遊島から球体へ移行し、5ランドマーク・雑居ビル・プラザ装飾すべてをボクセルで構築していた時代 | `v1-voxel-planet`（`47d21af`） | 2026-09-09 〜 |

**「バージョン」は main で公開されていたものだけを数える。** v0 と v1 のあいだには平面の浮遊島（7/18〜7/31）の時代があるが、`feature/` ブランチの上だけで作られ、main には一度も入っていない（`git log --first-parent main` で、7/18 の `827fbd8` の次は 9/9 の AdSense 追加 `ed4e3cb`、その次が惑星のマージ `d9e816f`）。訪問者が見たことのないものは沿革に数えない。v0 のタグを `827fbd8`（最後の内容変更）ではなく `ed4e3cb` に打ったのも、**置き換わる直前に実際に配信されていた状態**を残すため。

**制作実績のカードから開く。** `src/data/projects.ts` の `portfolio-vN` が `demoUrl: "/archive/vN"`（Play）と、タグの時点のソースツリー（Code）を指している。サムネイルは各版のトップをヘッドレスで撮った `public/images/portfolio_vN.webp`（1600×840 で撮って 1200×630 へ縮小、WebP q85）。

- **`demoUrl` は末尾スラッシュ無しで書く。** 本番は Vercel で、`/archive/v1` を直接 200 で返し、`/archive/v1/` は 308 でスラッシュ無しへ飛ばす。`/archive/v1/index.html` は **404**（2026-09-18 に miiiwa.com で実測）。`python3 -m http.server` は逆にスラッシュ無しを 301 でスラッシュ付きへ飛ばすが、どちらでも開ける
- **`npm run dev` ではカードからは開けない。** dev サーバーは `public/` のディレクトリに `index.html` を補わないので、`/archive/v1` は 404。`http://localhost:3000/archive/v1/index.html` を直接開けば動く（中の Privacy Policy へのリンクだけ 404）。**通しの確認は `npm run build` 後の `out/` を配信して行う**（`python3 -m http.server -d out` で足りる）
- `ProjectLinks` が `next/link` ではなく素の `<a>` なのはこのため（理由と実測は [tech.md](tech.md) の「その他」）
- **アーカイブは検索に載せない（`noindex`）。** 書き出しには公開当時のメタデータがそのまま焼き込まれている——v1 は `index, follow`（と canonical → 本番トップ）、v0 は robots の指定そのものが無い。放っておくと、古いプロフィールと実績一覧を載せた「Miiiwa | Portfolio」が本番と並んで検索に出る。canonical を本番トップへ向ける案は採らなかった（内容の違うページへの canonical は本来の用途から外れ、検索エンジンに無視されうる。v1 の canonical も、本番が新しい世界観に替われば同じ理由で効かなくなる）。`robots.txt` で `/archive/` を塞ぐ案も採らなかった（クロールを止めるだけで URL は結果に出うるうえ、`noindex` を読ませられなくなる）。リンクから開けば普通に動く

### 次のバージョンを保存する手順

**節目のコードが動くうちにビルドすること。** 何ヶ月も経ってから古いコミットを掘り起こすと、依存パッケージが今の Node/npm では素直に入らなくなっている可能性がある。v1 を保存したのも、ボクセル表現を撤退する決定の直後——まだ確実にビルドが通るうちに、という判断だった（v0 は中身が7月のままのコミットだったが、今と同じ Next 16.2.10 だったので `npm install` 8秒・ビルド一発で通った）。

1. 節目のコミットにタグを打ち、push する（`git tag -a vN-<名前> <commit> -m "..."`。Code のリンクがタグの `tree/` URL なので、push するまで 404）
2. そのコミットを `git worktree add --detach <dir> <commit>` で別ディレクトリへ取り出す（作業中のツリーを汚さないため）
3. 取り出した先の `next.config.ts` に **`basePath: '/archive/vN'` と `assetPrefix: '/archive/vN'` を足す**。これが無いと、書き出された HTML が `/_next/...` を**サイトのルート基準**で参照してしまい、**現行サイトのチャンクを読みに行って壊れる**（絶対パスはファイルの置かれたディレクトリではなくドメイン直下に解決されるため、iframe に入れても同じ）。この変更はコミットしない
4. `npm install && npm run build` して `out/` を得る
5. `out/` の中身を `public/archive/vN/` へコピーする（`rsync -a --exclude .DS_Store out/ public/archive/vN/`）
6. **画像のパスに `/archive/vN` を前置する。** `basePath` は `next/image` に文字列で渡した `src` には効かない（同梱ドキュメント `05-config/01-next-config-js/basePath.md` の「Images」）。放っておくと `"/images/x.png"` が**現行サイトの同名ファイルを黙って借りる**——v1 の制作実績の画像が、保存から2日間そうなっていた。テキストファイルの中の、引用符か `(` の直後の `/images/` だけを置き換える:
   ```bash
   cd public/archive/vN
   grep -rlE --include='*.html' --include='*.txt' --include='*.js' --include='*.css' "[\"'\`(]/images/" . \
     | while IFS= read -r f; do perl -pi -e 's#(["\x27`(])/images/#$1/archive/vN/images/#g' "$f"; done
   ```
   `/images/` 以外のディレクトリ（`/models/` など）を `public/` に持つ版なら、同じ置換を足す。どれが要るかは手順10のテストが名指しで教える
7. **検索よけ（`noindex`）を入れる。** 各 `.html` の robots を `noindex` にする。当時の値（`index, follow`）が入っている版は置き換え、無い版は `<meta charSet="utf-8"/>` の直後に足す。**HTML の `<meta>` だけでなく RSC ペイロードの中の同じ値も置き換える**——Next はページ間を移動するとき、`<head>` をペイロードから組み直す（v1 のトップ → Privacy Policy がそう）。`googlebot` の `<meta>` を持つ版（v1）はそれも `noindex` にそろえる:
   ```bash
   grep -rlE --include='*.html' --include='*.txt' --include='*.js' '(robots|googlebot).{0,30}index, follow' . \
     | while IFS= read -r f; do perl -pi -e 's/((?:robots|googlebot)(?:\\?"\s*,\s*\\?"content\\?":\\?"|" content="))index, follow/${1}noindex/g' "$f"; done
   find . -name '*.html' | while IFS= read -r f; do grep -q '<meta name="robots"' "$f" \
     || perl -pi -e 's#<meta charSet="utf-8"/>#<meta charSet="utf-8"/><meta name="robots" content="noindex"/>#' "$f"; done
   ```
   足しただけの `<meta>`（v0）は、ペイロード側に対応する要素が無いので React の hydration で消されないかが心配だったが、ヘッドレスで開いて hydration 後の DOM に残ること・エラーが出ないことを確かめた（v0・v1 のトップ、v1 の Privacy Policy）。404 ページには Next が最初から `noindex` を出している
8. **どこからも参照されないファイルを消す。** `export` は `public/` を丸写しするので、当時すでに使っていなかった画像や create-next-app の SVG まで入ってくる。`_next/` 以外の各ファイルについて、名前（と URL エンコードした名前）がアーカイブ内の HTML・`.txt`・JS・CSS のどこにも出てこないことを確かめ、**さらに元のソースを `git grep` して、名前を組み立てて参照していないことも確かめてから**消す。消したあとヘッドレスで全ページを開き、画像が全部読めて 404 が無いことを見る。`robots.txt`・`sitemap.xml` は参照されなくても残す（v0 で `me0.png`・`me2.mp4`・SVG 5つ、v1 で未使用の実績画像5枚を消した。どれも git の履歴から取り戻せる）
9. worktree を削除する（`git worktree remove --force <dir>`。`next.config.ts` の変更と `node_modules` が残っているので `--force` が要る）
10. 制作実績に載せる。`src/data/projects.ts` に1件足し（`demoUrl: "/archive/vN"`、`githubUrl` はタグの `tree/` URL）、サムネイルを `public/images/` に 1200×630 で置いて、`npm test`

**手順10の `npm test` が、手順3・6・7が効いたかを検査する**——`data/projectModel.test.ts` が、同じサイトを指す `demoUrl` それぞれについて、(1) `index.html` が実在する、(2) その `src=`／`href=` の絶対パスが全部 `demoUrl` の内側、(3) HTML・RSC ペイロード・JS・CSS に出てくる画像とモデルのパスが全部 `demoUrl` の内側で、しかも実在する、(4) すべての `.html` に `noindex` があり、ペイロードも含めて robots・googlebot の指定がすべて `noindex`、を確かめる。(3) が要るのは、v1 の制作実績のように**クライアントでしか描かれない画像は HTML に出てこない**から。

- **`node_modules` をシンボリックリンクで共有しようとすると Turbopack が `Symlink ... points out of the filesystem root` で落ちる**ので、worktree 側で素直に `npm install` する
- **手順6を zsh で `for f in $files` と書かない。** zsh は変数を空白で分割しないので、対象が2ファイル以上あると改行でつながった1つの名前として渡り、1つも置換されない（v1 は対象が1ファイルだったので気づかず、v0 で踏んだ）。**macOS の `grep -Z` も NUL 区切りの意味ではない**（BSD の grep では圧縮ファイルを読むオプション）。上の `while read` の形なら両方を避けられる
- **置換するのは書き出し後のテキストで、ビルドの設定ではない。** `images.loader: 'custom'` で前置するローダーを当てる方法も試した。HTML は正しくなるが、JS とデータには生の `"/images/..."` が残る（描画時にローダーが足すため）。そうなると「アーカイブ外を指す文字列が1つも無い」をテストで静的に断言できず、ローダーを当て忘れた版と区別できない。v1・v0 とも `integrity` 属性（SRI）は使っておらず、チャンクの中身を書き換えても読み込みは壊れない
