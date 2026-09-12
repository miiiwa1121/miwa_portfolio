# プロダクトレビュー（2026-08-02）

`feature/voxel-planet`（`d7eec6c`）時点の全体レビュー。**エンジニア兼デザイナー視点で、実装・デザイン・アクセシビリティ・コンテンツを通しで見た記録。**

前提として、ビルド・型・lint・テスト（329件）はすべてクリーン。`scene/` のコード品質とコメントの密度はこの規模のプロジェクトとしては例外的に高い。以下は**その上でなお、実機で見て初めて分かった欠陥**の一覧。

**このファイルは指摘の台帳であって、実装の正典ではない。** 直したら該当項目にチェックを入れ、恒久的な設計判断になったものは `tech.md` / `CLAUDE.md` 側へ移す。

---

## 進捗

| 区分 | 状態 |
| --- | --- |
| **A. 致命的（6件）** | **全件対応済み（2026-08-02）**。詳細は各項目の「対応」を参照 |
| B. 重大（11件） | B-3 はほぼ対応済み（2026-09-12、スマホ UI の作り直し）。残る1点は下記。**B-10 / B-11 は同日の監査で新たに見つかったスマホの不具合**。他8件は未着手 |
| C. 中（8件） | C-6 のみ対応済み（2026-09-11、ファイル構成レビュー）。残り7件は未着手 |
| D. 小（6件） | 未着手 |

**Aの対応で残った判断待ちが1つある**（A-3 の構図トレードオフ）。下記 A-3 の「残る判断」を参照。

次の着手順: B-1（プリレンダー本文）→ B-2（OGP）→ B-4（コントラスト）→ B-7（空プロジェクト）。B-1 はこのリストで投資対効果が最大。

---

## A. 致命的 — ✅ 全件対応済み（2026-08-02）

### A-1. 建物ズームで看板が鏡文字になる ✅ 対応済み

> **対応（2026-08-02）**: **診断が途中で間違っていた。** 当初「cos/sin の入れ替え」と書いたが、それは症状であって原因ではない。実際に入れ替えると仰角70.5°の真上見下ろしになり、`reference/image6.png`（地平線が下、看板が正対、仰角13°程度）から**遠ざかる**。
>
> **真因は `camera.up` が world +Y に固定されたまま、構図だけを建物のローカル座標系で組んでいたこと。** products の建物のローカル「上」は world +Z をほぼ向いており、`camera.up` が +Y のままだと原理的に画面上で横倒しになる（実測: 建物の上方向が画面垂直から84°ずれる）。experience は視線が真下から10.4°で `lookAt` が縮退し、ロールが不定 → 鏡文字。**仰角19.5°自体は image6 とほぼ一致していて正しかった。**
>
> `camera/cameraLayout.ts` に `sectionUp()` / `ORBIT_UP` を追加し、セクション寄りのあいだ `camera.up` をその建物自身の法線にした。飛行中は `slerpDirection` で world +Y から補間（`glideRef` に `fromUp`/`toUp` を追加）。`camera-controls` は `update()` 内で `camera.lookAt(target)` を呼ぶので、`setLookAt` の**前に** `updateCameraUp()` を呼ぶ必要がある（`_yAxisUpSpace` を張り直すのはこの関数だけ）。
>
> `sectionPose` の式も `SECTION_TILT` の値も変えていない。変えたのは `SECTION_TILT` の docstring（「法線から」→「地平線から」）で、この誤記こそが誤診を招いた。
>
> **検証**: products / experience の実機スクリーンショットで `GAME` `PRODUCTS` `LIBRARY` が正対して読め、建物が直立し、地平線が下に来ることを確認（`image6.png` とほぼ同じ構図）。

以下は当初のレビュー記述（誤診を含む。経緯として残す）。

建物ズーム時のスクリーンショットで **`PRODUCTS` と `GAME` の看板が左右反転して描画されている。**

原因は `scene/camera/cameraLayout.ts` の `sectionPose`:

```ts
tx + forward[0] * distance * cos + up[0] * distance * sin,
```

`SECTION_TILT` の docstring は「**法線から**傾ける角度」と書いているが、実装は `cos` を `forward`（地表接線）に、`sin` を `up`（法線）に掛けている。つまり**法線から19.5°ではなく、地平線から19.5°**。全5セクションで実測した:

| セクション | 地平線からの仰角 | 視線と「真下」の角度 |
| --- | --- | --- |
| products | 19.5° | **13.5°** |
| skills | 19.5° | **18.5°** |
| experience | 19.5° | **10.5°** |
| about | 19.5° | 37.5° |
| contact | 19.5° | 63.5° |

`camera.up` は world +Y に固定なので、視線が真下と 10〜18° しか離れていない products / skills / experience は **`lookAt` の縮退ケースの真上**にいる。ロールが不定になり、その結果が鏡文字。about（37.5°）と contact（63.5°）は安全側なので**緯度によって症状の重さが変わり、それが発見を遅らせた。**

皮肉なことに、自由回転にはこの縮退を避けるための `ORBIT_MIN_POLAR = 0.15`（8.6°）があるのに、`sectionPose` には何のクランプもない。

**解決策**: `cos` と `sin` を入れ替える。

```ts
tx + up[0] * distance * cos + forward[0] * distance * sin,
```

これで法線から19.5°の三四分割構図になり、products の視線は真下から約70°離れて縮退を抜ける。看板も正対する。構図が変わるので `SECTION_TILT` / `FRAME_MARGIN` の再チューニングが要る。

### A-2. そのバグをテストが「守って」いる ✅ 対応済み

> **対応（2026-08-02）**: 実装写しの assert を全部書き直した。
> - `angleAt(10) ≈ π/2 - SECTION_TILT` → **仰角をリテラル19.5°で**（式を言い換えず、`SECTION_TILT` の docstring が言う値そのものを書く）
> - `looks down rather than up at it` は**削除**。赤道上の建物で `forward` が world +Y になるため、縮退しているからこそ通っていた。消した理由をコメントで残した
> - **新設 `describe("sectionUp")`**: ①全セクションで視線が `camera.up` から30°以上離れること ②world +Y を使うと products/skills/experience の3つが縮退すること（バグそのものをピン留め）③建物のローカル垂直が画面垂直に載ること
> - `markerScreen.test.ts` を新設（A-3）
>
> **変異テスト**: cos/sin 入れ替え → 5件失敗 / `sectionUp` を `ORBIT_UP` に戻す → 4件失敗 / 法線を内向きに → 2件失敗 / カメラを看板の反対側へ → 2件失敗。すべて `cp` 退避・復元で確認。

`scene/cameraLayout.test.ts` の `sectionPose` の項が `angleAt(10) ≈ Math.PI / 2 - SECTION_TILT` を assert している。**これは仕様ではなく実装を写したテスト**で、コメントもわざわざ実装の式をなぞって理屈をつけている。さらに `it("looks down at the subject rather than up at it")` は、赤道上の建物で `forward` がちょうど world +Y になるため、**縮退しているからこそ通っている。**

CLAUDE.md の「変異テストで検証する」運用は正しいが、変異テストは*テストが実装と食い違う*ことは検出しても、*テストと実装が揃って仕様から外れている*ことは検出できない。**変異テストの盲点として記録しておく価値がある。**

**解決策**: 姿勢テストは「距離」「見ている先」ではなく **`camera.up` と視線の角度が閾値以上あること**を assert する。これは仕様（縮退を避ける）を直接書いた形になる。

```ts
it("never aims within 30° of camera.up, at any section", () => {
  for (const key of PLANET_SECTION_KEYS) {
    const pose = sectionPose(sectionPosition(key), 20);
    // 視線と world +Y の角度をリテラルで
    expect(angleBetweenViewAndWorldUp(pose)).toBeGreaterThan(30);
  }
});
```

### A-3. デフォルト表示でリーダーラインとスポットライトマーカーが完全に死んでいる ✅ 対応済み（**要判断あり**）

> **対応（2026-08-02）**: `NEAR_VERTICAL_SHARE` を **0.78 → 0**。`markerOnScreen()` を `markerScreen.ts` の純関数に切り出し、`markerScreen.test.ts` を新設。
>
> **一周実測**（20サンプル × 3ビューポート、ホイールで `tourURef` を直接送って計測）:
>
> | share | 画面外（1440×900） | 下方向の最大はみ出し |
> | --- | --- | --- |
> | 0.78（旧） | **16 / 20** | 648px |
> | 0.40 | 7 / 20 | 268px |
> | 0.20 | 3 / 20 | 115px |
> | 0.10 | 1 / 20 | 38px |
> | **0.00** | **0 / 20** | — |
>
> 1280×800・390×844 も同傾向。逆算した「全サンプルが収まる上限」は **share ≈ 0.04**（画面の1%）。しかも傾きは被写体を `share·radius·H/(2·depth)` px 押し下げるだけで、0.78 なら距離に関わらず900px画面の351pxを消費するため、**惑星を半径185以上（About と同じ豆粒）まで引かないと両立しない**。つまり2つは互いにチューニングできる関係にない。
>
> **検証**: 修正後の一周サンプリングで、14回中9回で導線が生存（旧: 0回）。残る非表示はマーカーがカードに近すぎて `MIN_TRAIL`(48px) に満たない区間で、これは設計どおり。
>
> **判断済み（ユーザー決定）**: **構図を取る。** `reference/image7.png` を実測した狙いは「惑星の中心が画面の65.5%右・**81.8%下**、半径は画面高の49%」で、惑星の中心は注視点そのものだから画面の `0.5 + share/2` の位置に来る——つまり81.8%は **share = 0.636**。旧 0.78 は「image7 の値」とされていたが実際には中心を89%まで押しており、**参考写真を0.15ぶん行き過ぎていた**。
>
> よって `NEAR_VERTICAL_SHARE = 0.636`。縦位置は参考写真と一致、サイズ（43% vs 49%）と横位置（61% vs 65.5%）は10%以内の残差で、どちらも `NEAR_ORBIT_RADIUS` / `ORBIT_CARD_SHARE` を同じ写真から起こした値なのでそのまま。
>
> **代償は明示的に受け入れた**: 正面のエリアは一周のうち多くで画面下に隠れ、点線は `markerOnScreen` によって自分を隠す。`cameraLayout.test.ts` にこのトレードオフを**ピン留めするテスト**を置いてある（`it("is knowingly past the point where the facing marker stays in frame")`）——うっかり「直され」ないように、緑になったら仕様変更だと分かる形。
>
> **副作用も1つ潰した**: 点線が出ない区間ではカードのアンカーの点だけが残り、コード自身が言う「線の無い点は迷子のシミに見える」状態になっていた。`CardLeaderLine` が線と同じ購読で点の opacity も操作するようにした。

ヘッドレスで52秒間サンプリングした結果:

```
near（デフォルト）: opacity=0 のまま、points は最初の1フレームで凍結、3セクション分回っても復帰せず
far              : opacity=1、終端が 927,450 → 714,546 と毎フレーム更新
```

`near`（`NEAR_ORBIT_RADIUS = 50` ＋ `focalOffsetY` の下方向オフセット）では、正面セクションのマーカーの投影座標が**ビューポートの下端より外**に落ち、`SectionMarkers.tsx` の `screenY <= height` が常に false になる。結果、`hide()` が毎フレーム呼ばれる。オレンジのスポットライトドットも画面に出ない（スクリーンショットに白ドットしか写っていないのがその証拠）。

つまり **`docs/tech.md` が長々と説明している「カード↔マーカー」の導線が、全訪問者が最初に見る画面で機能していない。** しかも `hide()` は無言で失敗する設計なので、気づきようがなかった。**距離とオフセットを変えたときに、この副作用を検算する仕組みが無かったことが本当の原因。**

**解決策**（①推奨）:
1. `near` の構図を見直す。`NEAR_VERTICAL_SHARE = 0.78` は `reference/image7.png` に合わせた値だが、その参照画像はマーカーの存在を前提にしていない。**構図とマーカーの可視性はトレードオフなので、どちらを取るかを決める必要がある。** マーカーが要るなら `NEAR_ORBIT_RADIUS` を上げるか縦オフセットを弱める。
2. `visible` の判定を「ビューポート内」から「ビューポート＋マージン内、かつ画面外なら端にクランプ」に変える。ただし「画面外を指す線」を許す設計変更なので①のほうが素直。

いずれにせよ **`useViewInput` と同じ粒度の回帰テストが要る。** `markerVisible(screenX, screenY, w, h)` を純関数に切り出して、`near` の実測姿勢で全5セクションが true になることを assert する。

### A-4. 詳細ページでロゴが消える ✅ 対応済み

> **対応（2026-08-02）**: `HubHeader` に `onLightBackground` を追加し、`pageOpen` のあいだロゴを `text-gray-900`（白い影も外す）に切り替えた。About は白いシートを持たないので対象外（`pageOpen` は false）。実機で確認済み。
>
> **未対応**: 詳細ページの `×` ボタン（C-7）。スクロール脱出が唯一の出口という状態は残っている。

`hub/HubHeader.tsx` のロゴは `text-white` ＋ 白の `text-shadow`。詳細ページ（白いシート、z-20）の上にヘッダー（z-40）が乗るので、**白背景に白文字**になる。スクリーンショットではオレンジの `.` だけが点として残っていた。

詳細ページには閉じるボタンが無く、脱出手段は「上下どちらかの端までスクロール」だけ。その状況で**唯一の直感的な帰り道であるロゴが不可視**なのは、見た目の問題ではなく導線の欠落。

**解決策**: `pageOpen` を `HubHeader` に渡し、開いている間は `text-gray-900`（＋影を外す）に切り替える。合わせて詳細ページに `×` ボタンを置く（C-7）。

### A-5. Contact のメールアドレスがプレースホルダのまま ✅ 対応済み

> **対応（2026-08-02）**: ユーザー判断により**メールボタンごと削除**。残るのは X の DM ボタン1つ。本物のアドレスを載せるかどうかは別の判断なので、決まるまで導線を1本に絞った旨をコード側にもコメントで残した。

`detail/Contact.tsx`:

```tsx
<Link href="mailto:contact@example.com">
```

**「Email Me」CTA がどこにも繋がっていない。** ポートフォリオで一番押してほしいボタン。

### A-6. 自己紹介が実質読めない ✅ 対応済み

> **対応（2026-08-02）**: ユーザー指示は「`reference/image9.jpg` を参考に。静的ページは不要。停止ボタンで止まるし手動スライドも可なので長さは問題ない」。よって**クロールを残したまま、実写フレームに合わせ込む**方針で直した。
>
> `image9.jpg` の実測（720pフレーム）: 消失点はフレーム上端の少し上、文字は画面下端で**フレーム高の8〜10%**、**最前列は左右とも画面外にはみ出す**、そして**フレーム中央**に対して対称、1行は13〜15文字。
>
> | 項目 | 変更前 | 変更後 | 根拠 |
> | --- | --- | --- | --- |
> | 列の位置 | `left-[-3%]` の左寄せ | **フレーム中央**（`w-[128%] -ml-[14%]`） | image9 は中央対称。投影は `perspective-origin` を軸に扇状に広がるので、軸から離れた列は「大きく」ではなく「引き伸ばされて」いた |
> | `perspective` | 160px | **420px** | 箱の奥行き763px÷160pxでスケール比5.8倍の超広角。image9 の可読帯は3.3倍程度 |
> | `rotateX` | 58° | **46°** | 同上 |
> | 本文サイズ | `text-3xl sm:text-4xl` | **`text-4xl sm:text-5xl lg:text-7xl xl:text-[6.5rem]`** | 「1行13〜15文字」を保つ比率で刻む |
> | はみ出し | 無し（列がフレーム内） | **左右とも画面外へ** | `overflow-y:auto` は `overflow-x` を `auto` にするため、内側だけ広げるとローカル空間で切り戻され全行が均一に切れる。箱ごと画面より広げてビューポートに切らせる |
> | コントラスト | 黄 on 惑星の緑 = **1.60** | `text-shadow` の暗い縁取り | image9 は純黒の星空。惑星と重なる区間だけ縁取りが効き、星空上では見えない |
> | 送り速度 | `ABOUT_AUTO_SCROLL_SPEED = 14px/s` | **`ABOUT_AUTO_SCROLL_LINES_PER_SECOND = 0.5`** | px レートは暗黙に文字サイズを埋め込む。拡大でスクロール総量が3,553→7,881pxになり、誰も速度を変えていないのに115秒の読み物が8分になった。さらにブレークポイント4段で4通りの速さになっていた。**行は読者が実際に消費する単位**なので、そこを固定する |
>
> `autoScrollStep(deltaSeconds, lineHeightPx)` は DOM から読んだ行高を受け取る。`line-height: normal` が NaN で返るケースのガードあり（NaN を `scrollTop` に入れると 0 に落ちてクロールが先頭で固まる）。
>
> **変異テスト**: 行数レート→固定px / NaNガード削除 / クランプ削除 の3つでそれぞれ1件ずつ失敗を確認。
>
> **未対応**: 総所要は約100秒（0.5行/秒）。ユーザーが長さを許容しているため短縮していない。
>
> **追記（2026-08-03）**: 上表の「コントラスト」対策だった `text-shadow` を、ユーザーの指示で撤去した。惑星と重なる区間はコントラスト比1.60まで戻る認識をユーザーに伝えたうえでの実施——見た目の好みの問題として扱い、この表の解決策としては再度「未対応」に戻っている。気になった場合の代案（縁取り以外での対策）はまだ検討していない。

以下は当初のレビュー記述。

`[perspective:160px]` ＋ `rotateX(58deg)`（`hub/about/About.tsx`）で、支点からの高さ `h` px の行の縮小率は `160 / (160 + 0.848h)`:

| 支点からの高さ | 縮小率 | `text-4xl`(36px) の実効サイズ |
| --- | --- | --- |
| 100px | 0.65 | 23px |
| 300px | 0.39 | 14px |
| 600px | 0.24 | 8.6px |
| 900px（箱の上端） | 0.17 | 6px |

**等倍で読める帯は箱の最下端の1行分だけ。** コメントには「支点では常に等倍」「perspective は 160px まで戻して手前の歪みを消した」とあるが、その「手前」が1行しかないため、実際には本文のほぼ全部が 8〜17px 相当・傾斜・黄色文字で流れていく。撮影した画面では本文が画面左上の 110px 四方に潰れていた。

加えて:

- 自動再生 14px/s、スクロール量は 1616px → **読み切るのに約115秒。** しかも `ABOUT_RETURN_AT = 0.995` に到達しないと帰れない。
- 黄色 `#FFE81F` の惑星の緑（`#7ecb3b`）に対するコントラスト比は **1.60**。列は `max-w-5xl`(1024px) を `left-[-3%]` に置いているので、near ズームでは確実に惑星と重なる。
- **自己紹介の静的な代替が存在しない**（`Sheet` は `about` を除外）。「Miiiwaが誰か」を読む手段がこれ一つ。

デザインの好みではなく、**ポートフォリオの中核コンテンツが届いていない**という機能欠陥。演出としての価値は理解できるが、コストが釣り合っていない。

**解決策**（優先順）:
1. **Aboutにも詳細シートを用意する。** クロールは「入り口の演出」として残し、読むための静的ページを別に持つ。他4セクションと同じ構造になるので実装も安い。
2. クロールを残すなら `perspective` を 400〜600px まで緩め、`rotateX` を 30〜40° に落とす。読める帯が数行に広がる。
3. 本文の下に半透明の暗いバッキングを敷いて惑星とのコントラストを確保する。
4. `ABOUT_AUTO_SCROLL_SPEED` を上げるか、「スキップ」を用意する。115秒の強制視聴は誰も待たない。

---

## B. 重大 — 公開品質に届いていない

### B-1. プリレンダーHTMLに文字が1つも入っていない

`npm run build` の出力を検証した:

```
out/index.html : 14,585 bytes
タグを剥がした本文テキスト : (空)
```

`app/page.tsx` が `"use client"` の `Hub` をそのまま re-export しているため、**プロジェクト・経歴・スキル・自己紹介のすべてが静的HTMLに存在しない。** 結果:

- 検索エンジンにインデックスされる文字がゼロ
- X / Slack / Discord のリンクプレビューがタイトルと説明文だけ
- JSを切った環境・軽量ブラウザで真っ白

`sectionUrl.ts` のコメントは「これは直さない」と明記しているが、**就活用ポートフォリオでこれは選択ではなく欠陥。** 3D体験を1バイトも削らずに直せる。

**解決策**: `app/page.tsx` をサーバーコンポーネントにして、`<Hub />` の後ろに視覚的に隠したセマンティックHTMLを置く。

```tsx
// app/page.tsx （"use client" なし）
import Hub from "@/hub/Hub";
import { PROJECTS } from "@/data";

export default function Page() {
  return (
    <>
      <Hub />
      {/* クローラと非JS環境向け。sr-only ではなく実HTMLとして出す */}
      <div className="sr-only">
        <h1>Miiiwa — 27卒 学生エンジニア</h1>
        {PROJECTS.map(p => (
          <article key={p.slug}>
            <h2>{p.title.ja}</h2>
            <p>{p.description.ja}</p>
          </article>
        ))}
        {/* 経歴・スキルも同様 */}
      </div>
    </>
  );
}
```

`sr-only` はDOMに存在するので `output: 'export'` でも静的HTMLに焼かれる。JSON-LD（`Person` / `CreativeWork`）も同時に入れておくと効果が大きい。

### B-2. OGP / Twitterカード / アイコンが未設定

`app/layout.tsx` の `metadata` は `title` と `description` だけ。`metadataBase`・`openGraph`・`twitter`・`icons`（`favicon.ico` はあるが `apple-touch-icon` 等が無い）がない。**共有されたときにカードが真っ白。**

**解決策**: 惑星のスクリーンショットを `public/og.png`（1200×630）として置き、

```ts
export const metadata: Metadata = {
  metadataBase: new URL("https://<本番ドメイン>"),
  title: "Miiiwa | Portfolio",
  description: "Miiiwaのポートフォリオサイト - 面白いを最優先！",
  openGraph: { type: "website", locale: "ja_JP", images: ["/og.png"], siteName: "Miiiwa" },
  twitter: { card: "summary_large_image", images: ["/og.png"], creator: "@miiiwa3330" },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};
```

### B-3. モバイルが壊れている（2026-09-12、大部分を対応）

**対応済み**（[devlog 2026-09-12](devlog/202609.md#2026-09-12) / [scene-invariants.md](scene-invariants.md) の「スマホ」節）:

- ~~ズームコントロールのボタンが画面右端で切れている~~ → スマホのヘッダーは ロゴ / 言語 / メニュー の3つだけになり、停止とズームはジェスチャに置き換わった。390px で切れなくなった
- ~~モバイルの導線はカードのスワイプのみ~~ → 全画面のメニュー（`hub/MobileMenu.tsx`）を追加。5セクションが一目で並ぶ
- ~~縦長では地表の灰色ブロックしか見えない~~ → `HANDHELD_VERTICAL_SHARE`（0.15）で水平線がフレームに入るようにした。390×844 で空が95px

**残っているもの**:

- **`NEAR_ORBIT_RADIUS = 50` は依然としてアスペクト比を見ていない。** 縦長でも水平線は入るようになったが、それはカメラの縦オフセットを縦長用に取り直したからで、**距離そのものは PC と同じ**。当初の解決策案（`orbitRadiusForZoom()` にアスペクト比を渡し、`aspect < 1` のとき引く）は未実施。実施すると `HANDHELD_VERTICAL_SHARE` の実測（一周20点）をやり直す必要がある——距離が変われば水平線の位置もマーカーの位置も動くため

### B-4. コントラスト不足（実測）

| 要素 | 前景 / 背景 | 比率 | 判定 |
| --- | --- | --- | --- |
| **CTAボタン全般**（詳しく見る / ナビ選択中 / フィルタ選択中 / HOME） | `#fff` on `orange-500` | **2.80** | ✕ AA |
| フッター | `gray-500/80` on 宇宙 | **3.00** | ✕ |
| フッター | `gray-500/80` on 惑星の草・砂 | **1.98〜2.02** | ✕✕ |
| カードのサブラベル（WORKS等） | `gray-400` on 白 | **2.54** | ✕ |
| Aboutクロール | `#FFE81F` on 惑星の緑 | **1.60** | ✕✕ |

CTAは `text-lg`(18px) / 16px の bold で、WCAGの「大きい文字」例外（bold 18.66px以上）にわずかに届かない。**サイトで一番押されるコンポーネントが全滅。**

**解決策**: 塗りを `--primary-strong`（`#c2410c`、既存トークン）にすると白文字で **5.18** になり AA を通る。ブランドカラーの系統内で解決できるのが利点。ホバーで `orange-500` に明るくすれば「オレンジのサイト」という印象も保てる。フッターは `text-white/70`（宇宙上で約9:1）＋暗い縁取り、またはヘッダー同様の白いピルに入れる。

参考（実測）:

| 塗り | 白文字 | `#1f2937` 文字 |
| --- | --- | --- |
| `orange-500 #f97316` | 2.80 | 5.24 |
| `orange-600 #ea580c` | 3.56 | 4.12 |
| `orange-700 #c2410c` | **5.18** | 2.83 |
| `orange-800 #9a3412` | 7.31 | 2.01 |

### B-5. `userScalable: false` は WCAG 1.4.4 違反

`app/layout.tsx` の `viewport`。ピンチ判定を守るためなのは理解できるが、**ページ全体のズームを禁止する**のは弱視ユーザーの締め出し。

**解決策**: `maximumScale` / `userScalable` を外す。キャンバス上のネイティブピンチは `Hub.tsx` の `touch-none` がすでに止めている（tech.md は「どちらか一方だけでは不十分」と書いているが、それは*キャンバス外*でページがズームすることを問題視した話で、キャンバス外のズームはむしろ許すべきもの）。

### B-6. 言語切り替えの実装が浅い

`state/LanguageContext.tsx` は `useState<Language>("ja")` だけ。

- `<html lang="ja">` が固定。ENに切り替えても `lang` は `ja` のまま → スクリーンリーダーが英語を日本語音素で読む。
- **localStorage に保存されない** → リロードで日本語に戻る。
- `navigator.language` を見ない → 海外からの訪問者に日本語が出る。
- ターミナルは日本語固定（C-1）。

**解決策**: `useEffect` で `document.documentElement.lang` を同期、`localStorage` に永続化、初回だけ `navigator.language` を参照。3つとも数行。

### B-7. 制作実績の半分が空

`data/projects.ts`: **8件中4件が `project_placeholder.webp`（COMING SOON画像）**、**6件が `githubUrl: "#"`**、3件が `demoUrl: "#"`。

しかも死んだリンクでも Code / Play のボタンは出ていて、押すと「これは秘密だぜ🤫」というトーストが出る。**採用担当が見る画面としては、空のカードを並べてから「秘密」と言われる形。**

**解決策**:
- URLが `#` のときはリンク自体を出さない（`ProjectLinks` に `if (isPlaceholderUrl) return null`）。「秘密」トーストは1箇所くらいなら愛嬌だが、6箇所は事故に見える。
- COMING SOON の4件は、**出さない**か、`status: "dev"` を前面に出して「開発中」セクションに分離する。gashaan / Umoja は説明文が良いので、スクリーンショットが無いなら簡単なモックやロゴだけでも置いたほうが遥かにマシ。
- `imadoko.webp` は OpenStreetMap のタイルをそのまま撮ったものに見える。**帰属表示（ODbL）が必要**なので確認する。

### B-8. `prefers-reduced-motion` が全く無い

grep して0件。自動回転する惑星、常時脈動するマーカー、スターウォーズ風の傾斜スクロール、framer-motion の入場アニメ — 前庭障害のあるユーザーにはかなり厳しい構成。停止ボタンがあるのは良いが、**押すまでの数秒がすでに問題。**

**解決策**: `useReducedMotion()`（framer-motion 同梱）で初期 `paused` を true にし、`Section` / `ProjectCard` の `whileInView` を無効化する。

### B-9. キーボード操作が成立していない

- `detail/products/ProjectCard.tsx` はクリック可能な `motion.div`。`role` も `tabIndex` も `onKeyDown` も無く、**キーボードだけではプロジェクト詳細を開けない。**
- `detail/products/ProjectModal.tsx` は `aria-modal` を宣言しているのにフォーカストラップも初期フォーカスも復帰も無い。Escapeは効く。
- `focus-visible` のスタイルがコードベース全体で0件。多くのボタンが `transition-transform` のみなので、フォーカスリングはブラウザ既定に委ねられ、オレンジ背景上ではほぼ見えない。

**解決策**: ProjectCard を `<button>` にする（`whileHover` は保てる）。モーダルは focus trap を入れるか、素直に `<dialog>` + `showModal()` にする（静的サイトなので依存を増やさず済む）。`globals.css` に共通の `:focus-visible { outline: 2px solid var(--primary-strong); outline-offset: 2px; }` を1行足す。

---

### B-10. スマホで自己紹介のクロールがタッチでほとんど動かない

実測（390×844、`hasTouch`）: **500px 指を滑らせて進むのは 73px**。うち約32pxは 0.5行/秒の自動再生ぶんなので、指の寄与は正味40px 程度しかない。

**原因**: `About.tsx` の rAF ループが毎フレーム `scrollCatchUp` で `scrollTop` を `scrollTargetRef` へ引き戻す。ホイールには専用ハンドラ（`wheelScrollStep` で `scrollTargetRef` を進める）があるが、**タッチには無い**ので、ネイティブのタッチスクロールが書いた `scrollTop` が次のフレームで打ち消される。

**解決策**: ホイールと同じ形のタッチハンドラを足す（`touchstart`/`touchmove` で指の移動量を `ABOUT_SCROLL_RATE` 相当に換算して `scrollTargetRef` に足す）。列は `overflow-y: auto` のままでよいが、`touch-action: none` にしてブラウザのネイティブスクロールを止めないと、指が書いた `scrollTop` と目標値が二重に効く。

**再現手順**: `#about` を開き、クロールの上を上方向に大きくスワイプする。文字がほとんど進まない。

### B-11. `h-screen` と `window.innerHeight` がモバイルでずれる

`Sheet.tsx` のスペーサーは `h-screen`（= 100vh = large viewport height）、`Hub.tsx` のパーク位置とスクロール進捗の計算は `window.innerHeight`（= ツールバー表示中は small viewport height）。iOS Safari ではこの2つが**約100pxずれる**。

**影響**: 詳細シートを開いた直後、スペーサーが `window.innerHeight` ぶんしかスクロールされないので、シートの上端が画面下端から約100px 浮いた状態で止まる（その隙間からジオラマが見える）。ヘッドレスでは両者が一致するため**この環境では再現しない**。

**解決策**: `Hub.tsx` がスペーサーの高さを定数から計算するのをやめ、**実際のスペーサー要素を測る**（`data-spacer` を付けて `offsetHeight` を読む）。`SPACER_VH` と `h-screen` という「同じ数を2箇所」の関係もこれで消える。

## C. 中 — 一貫性・品質

### C-1. ターミナルだけコード品質と内容が浮いている

`terminal/TerminalOverlay.tsx` は他のファイルと明らかに別物（コメント無し、`switch` 内の `case` 宣言、`setTimeout(..., 0)` の意味不明な使用、クリーンアップ漏れ）。それ自体は「イースターエッグだから」で通るが、**内容が本編と矛盾している**のは通らない:

```
ターミナル: [2023] プログラミング学習開始 / [2024] 実践とチーム開発 / [2025] キャリアスタート準備
Experience: [2019] コンピュータの世界への覚醒 / [2020] 情報系高校 / [2024] 42tokyo / [2025] GCI
```

**同じ人の経歴が2種類ある。** `products/` の中身も `product1.exe` `product2.exe` `product3.exe` で、実在のプロジェクト名が一つも出てこない。日英切り替えも効かない。Escapeで閉じられない。

**解決策**: ASCIIアートの中身を `data/` の実データから生成する（`PROJECTS` から `ls` の一覧を作る等）。少なくとも `ASCII_EXPERIENCE` は `experiencesJP` と同じソースにする。矛盾した情報が2箇所にあるのは、イースターエッグの魅力を超えて信頼性の問題になる。

### C-2. 大気の無い惑星に雲が浮いている

`docs/tech.md` は「フォグは無い——**大気が無い場所**には『遠景を距離で溶かす』役が存在しない」と明記している。その同じ理屈が `Decorations.tsx` の `Clouds` には適用されていない。高度10.5〜13（惑星半径16.8に対して62〜77%）に白いボクセル塊が4つ浮いている。

スクリーンショットでは**惑星から明らかに離れた白い破片**として写っており、演出ではなくバグに見える（far ズームの右下の1つは特に顕著）。

**解決策**: 雲を消すか、小型の衛星・宇宙ステーション・デブリに置き換える。宇宙の惑星というコンセプトに沿うのは後者で、しかも既存の `standAt` / `offsetDirection` の仕組みをそのまま使える。

### C-3. 雑居ビルが都市ではなく瓦礫に見える

`FillerCity.tsx` の `WALL_COLORS` は cream / sand / stone のみ、ルーフは `stone[1]` 固定、窓も屋根の起伏もなし。実際の描画では**灰色〜ベージュの箱が均一に散らばった状態**で、ランドマーク（観覧車・ピンクのタワー）の色彩と激しく浮く。

分布も偏っている。`clusterCount: 10` × `clusterAngularRadius: 0.35` では、far ズームで見ると**左半球が密集・右半球がほぼ裸地**だった。被覆率25.4%という数字が「均等に薄い」ではなく「片側に寄っている」形で出ている。

**解決策**:
- `WALL_COLORS` にパステルの淡い色（`PALETTE.pink`/`blue`/`green` の明るい段）を数割混ぜる。1ドローコール制約は色を増やしても壊れない（`PlacedVoxels` は色をインスタンス属性で持っている）。
- 屋根色を建物ごとに変える（`colorSeed` はすでにある）。
- `clusterCount` を 10 → 16 程度に増やし `buildingsPerCluster` を 30 → 20 に減らす。総数はほぼ変えずに分布が均される（`fibonacciSphere` の候補は `clusterCount * 3` なので候補数も自動で増える）。

### C-4. docs が実装から乖離している

CLAUDE.md 自身が「都度更新する」を最重要ルールに掲げているので、これは指摘せざるを得ない。

| ドキュメント | 記述 | 実際 |
| --- | --- | --- |
| `docs/tech.md` | ZoomControl は「ホバー/タップで縦のバーが開き、3段目盛りを直接クリック」 | 1個のボタンを順に押して巡回（`ZoomControl.tsx`） |
| `docs/tech.md` | 「空白がスクローラと同じ高さちょうど（`h-full`）」 | `h-[8%]` と `h-2/3` |
| `docs/tech.md` | `ABOUT_SCROLL_RATE = 0.5` | `0.2`（`aboutScroll.ts`） |
| `README.md` | 「**長押し＋ドラッグ**で自由に見回せます」 | 長押し判定は存在しない、素のドラッグ |
| `README.md` | 「建物を**クリックすると**カメラが飛び込み」 | 建物は明示的に inert（`ProceduralObjects.tsx` の `Anchor`）。クリックできるのはマーカーだけ |
| `README.md` | Aboutを読み切ると「ホームの**俯瞰**へ戻る」 | `near` に戻る（`far` が俯瞰） |

README はピンチズーム・ズームコントロール・スターウォーズ風クロールに一切触れていない。**CLAUDE.md は最新、tech.md と README は数世代前**という状態。

### C-5. バンドルが重い

```
JS 合計 : 1,799 KB (raw) / 513 KB (gzip)
最大チャンク : 1,181 KB / 334 KB gz  ← three.js
```

three.js だけで gzip 334KB、**初期表示に全部必要。** 4G回線では体感で数秒。惑星が出るまで真っ黒な画面が続く。

**解決策**（コストの低い順）:
1. **ローディング表示を入れる。** 現状は `#070a14` の真っ黒が数秒続き、壊れているように見える。ロゴ＋プログレスだけでも体感が大きく変わる。これが一番費用対効果が高い。
2. `next.config.ts` に `experimental.optimizePackageImports: ["lucide-react", "react-icons"]` を足す。`react-icons/si` から30個importしているので効く。
3. three.js のツリーシェイクは R3F 経由だと効きにくいが、`Stars`（drei）は自前実装に置き換えれば drei の依存を減らせる（`speed={0}` で使っているだけなので、`Points` 1個で済む）。

### C-7. 詳細ページに閉じるボタンが無い

`Sheet` の脱出手段は「上端まで戻る」「下端まで進む」のみ。上下に `h-screen` の透明スペーサーがあることは**画面上に何の手がかりも出ていない。** A-4でロゴも消えているので、詳細ページに入った訪問者は行き止まりに感じる。

**解決策**: 右上に `×` を固定表示する（`activeSection && !pageOpen` のときだけ出している HOME ボタンと同じ扱いでよい）。スクロール脱出は「知っている人向けのショートカット」として残せば両立する。

### C-8. `Products` のスクロールロックが no-op

`detail/Products.tsx` が `document.body.style.overflow = "hidden"` を設定しているが、**スクロールしているのは `Sheet` の `fixed inset-0 overflow-y-auto` な div であって body ではない。** `main` 自体が `h-screen overflow-hidden` なので body は元々スクロールしない。つまりこの effect は何もしていない。

実害は今のところ限定的（モーダルは `body` にポータルされていて DOM 上 Sheet の子孫ではないため、スクロールチェーンが Sheet に伝播しない）だが、**「効いているつもりのコード」**が残っているのは危険。モーダル内のコンテンツをスクロールし切ったときの挙動を保証したいなら、`scrollerRef` を渡してそちらをロックするか、`.custom-scrollbar` に `overscroll-behavior: contain` を足す。

---

## D. 小さいもの

- **`closePage()` の `window.scrollTo`**（`AppStateContext.tsx`）も C-8 と同じ理由で no-op。
- **`<section id="products">`（`detail/Section.tsx`）と URL hash `#products` が同名。** 現状は `pushState` を使っているので副作用は出ないが、将来 `location.hash = ...` に変えた瞬間にブラウザがその要素へスクロールする。片方に接頭辞を付けておくと安全。
- **Context の value が毎レンダー新規オブジェクト**（Language / Terminal）。AppState は 2026-08-05 に `useMemo` 済み——あわせて `facing` を Context から購読チャンネルへ出した（`<Canvas>` より上の Context が変わると three.js のツリー全体が再調停されるため。理由は [docs/tech.md](tech.md) の「毎フレームの値は React state に載せない」）。
- **画像ファイル名が日本語**（`音階神経衰弱.webp`）。URLエンコードで動くが、CDN やホスティングによっては事故る。ローマ字推奨。
- **Skills が30個のフラットグリッド。** 習熟度も分類も無いので「ロゴを30個並べた」以上の情報がない。皮肉なことに**ターミナル側の `ASCII_SKILLS` は FRONTEND / BACKEND / MOBILE / INFRA / TOOLS に分類されていて情報量が上。** 本編にも同じ分類を入れる。`Claude` を言語・FWと同列に置くのも一考の余地がある。
- **直近のコミットメッセージが `ok`。** 採用担当が git 履歴を見る可能性を考えると、ここも成果物。

---

## 良かった点（お世辞抜きで）

- **`scene/planet/` の純関数への切り出しとテスト設計は本当に良い。** 329件が0.8秒で回り、three.js を一切要求しない構成は、この規模の3Dプロジェクトでは珍しい。
- **コメントが「何をしたか」ではなく「なぜそうしたか・何を試して却下したか」を書いている。** `glidePose` が `lerp` を使わない理由、`frameSizeChanged` が値比較である理由（実測141px/164pxまで書いてある）、`primed` フラグが存在する理由 — どれも将来の自分か他人を確実に救う。
- **大円の膨らみ（南緯40°・経度差144°で29.8°）を実測して緯度経度補間に倒した判断**は、球面幾何を理解していないと辿り着けない。
- **`markerScaleForScreenRadius` の「画面pxを決めてワールドscaleを逆算する、逆はできない」**という洞察は正しく、実装も正しい。
- `sceneClock` による一元的な一時停止と、`<Stars speed={0}>` という例外の扱いも筋が通っている。

---

## このレビューの調べ方（再現手順）

同じ検証を繰り返すとき用。

- **見た目**: CLAUDE.md の puppeteer-core レシピ（`headless: "new"` / SwiftShader / 7秒待ち）。1440×900 と 390×844。
- **リーダーラインの死活**: `document.querySelector("svg g")` の `getComputedStyle(...).opacity` と `polyline` の `points` を4秒おきに14回サンプリング。**opacity が 0 のまま、points が凍結**なら死んでいる。ズーム段の切り替えは `button[aria-label^="ズーム"]` を `click()`。
- **`sectionPose` の幾何**: 診断用テストを一時的に置いて、全セクションの「地平線からの仰角」と「視線と真下の角度」を `console.log` する。テストは残さない（診断であって仕様ではない）。
- **コントラスト**: WCAG の相対輝度式を node のワンライナーで。惑星の色は `PALETTE` の実値（草 `#7ecb3b`、宇宙 `#070a14`）を背景に取る。
- **プリレンダー内容**: `npm run build` の後、`sed 's/<script[^>]*>.*<\/script>//g; s/<[^>]*>/ /g' out/index.html` でタグを剥がして本文が残るか見る。
- **バンドル**: `find out -name "*.js" -print0 | xargs -0 cat | gzip -9 | wc -c`。
