import type { ProjectSource } from "./projectModel";

/**
 * The project catalogue, in display order.
 *
 * One entry per project — adding one means editing this array and nothing
 * else. (It used to be eight files plus a barrel that listed every project
 * twice, so a new project had to be registered in three places.)
 */
export const PROJECTS: ProjectSource[] = [
  {
    slug: "gashaan",
    title: { ja: "gashaan", en: "gashaan" },
    description: {
      ja: "「脳死でできる、究極のストレス解消体験」。現実のレイジルーム（破壊部屋）のカタルシスを手のひらの上でいつでも再現する、超リアルな破壊シミュレーション。",
      en: '"The ultimate stress relief experience you can do mindlessly." An ultra-realistic destruction simulation that reproduces the catharsis of a real rage room in the palm of your hand.',
    },
    image: "/images/coming_soon.png",
    tags: ["iOS", "Unity 6 (URP)"],
    category: "APP",
    status: "dev",
    githubUrl: "#",
    demoUrl: "#",
  },
  {
    slug: "umoja",
    title: { ja: "Umoja (ぐるディス)", en: "Umoja (GruDis)" },
    description: {
      ja: "「文字にはわからないことがある」グループディスカッション（GD）をオンラインで評価し、参加者が自分の意思で企業へ評価データを送れるプラットフォームです。",
      en: "Some things cannot be understood through text. A platform that evaluates online group discussions (GD) and allows participants to send evaluation data to companies at their own discretion.",
    },
    image: "/images/coming_soon.png",
    tags: ["Next.js", "Supabase", "LiveKit", "Gemini", "Whisper"],
    category: "WEB",
    status: "dev",
    githubUrl: "#",
    demoUrl: "#",
  },
  {
    slug: "imadoko",
    title: { ja: "imadoko", en: "imadoko" },
    description: {
      ja: "URLを共有するだけで現在地をリアルタイムに共有できるWebアプリです。アプリインストールやアカウント登録は不要で、すぐに使い始められます。",
      en: "A web app that allows you to share your current location in real-time just by sharing a URL. No app installation or account registration is required, and you can start using it immediately.",
    },
    image: "/images/imadoko.png",
    tags: ["Next.js", "Supabase", "Tailwind CSS", "Leaflet"],
    category: "WEB",
    status: "Public",
    githubUrl: "https://github.com/miiiwa1121/imadoko",
    demoUrl: "https://imadoko.miiiwa.com",
  },
  {
    slug: "michaw",
    title: { ja: "Michaw（見ちゃう）", en: "Michaw" },
    description: {
      ja: "視線推定・アイトラッキングを活用し、画像の中の「つい見てしまう場所」を見てしまうまでの時間を計測するブラウザゲーム・エンタメWebアプリです。",
      en: "An entertainment web app and browser game using eye tracking to measure how long it takes before looking at irresistible points in an image.",
    },
    image: "/images/michaw.png",
    tags: ["Next.js", "MediaPipe", "Cloudflare Workers", "D1"],
    category: "WEB",
    status: "Public",
    githubUrl: "https://github.com/miiiwa1121/michaw",
    demoUrl: "https://michaw.miiiwa.com",
  },
  {
    slug: "synesthesium",
    title: { ja: "Synesthesium", en: "Synesthesium" },
    description: {
      ja: "音階、色覚、モールス、リズムなど、様々な感覚を研ぎ澄ます無料の神経衰弱ゲーム・コレクション。ブラウザでいつでも手軽にプレイできます。",
      en: "A sensory memory matching game collection challenging sound pitch, color perception, Morse code, and rhythm in the browser.",
    },
    image: "/images/synesthesium.png",
    tags: ["Next.js", "React", "Web Audio API", "Tailwind CSS"],
    category: "WEB",
    status: "Public",
    githubUrl: "https://github.com/miiiwa1121/synesthesium",
    demoUrl: "https://synesthesium.miiiwa.com",
  },
  {
    slug: "portfolio-v1",
    title: { ja: "Miiiwa Portfolio v1", en: "Miiiwa Portfolio v1" },
    description: {
      ja: "このサイトの2代目。宇宙に浮かぶボクセルの惑星と、その上の5つのランドマークや街並みを、すべてコードで手続き的に生成した3Dポートフォリオ。世界観を作り直すにあたり、当時のビルドをそのまま触れる形で保存しています。",
      en: "The second version of this very site. A 3D portfolio whose voxel planet floating in space, five landmarks and city are all generated procedurally in code. With the world being rebuilt, the original build is preserved here, still fully playable.",
    },
    image: "/images/portfolio_v1.webp",
    tags: ["Three.js", "React Three Fiber", "Next.js", "TypeScript"],
    category: "WEB",
    status: "Public",
    // The build itself lives in this repo under public/archive/v1/ — see
    // docs/structure.md. No trailing slash: that is the form Vercel serves
    // directly, and it 308s "/archive/v1/" to it.
    githubUrl: "https://github.com/miiiwa1121/miwa_portfolio/tree/v1-voxel-planet",
    demoUrl: "/archive/v1",
  },
  {
    slug: "portfolio-v0",
    title: { ja: "Miiiwa Portfolio v0", en: "Miiiwa Portfolio v0" },
    description: {
      ja: "このサイトの初代。黒地にネオンのグラデーションを重ね、カーソルから逃げ、長押しで吸い寄せられるパーティクルを敷いた、1ページ縦スクロールの HTML ポートフォリオ。3Dの惑星（v1）に置き換わるまで公開していたビルドを、そのまま触れる形で保存しています。",
      en: "The first version of this very site. A single-page, scrolling HTML portfolio: neon gradients on black over a field of particles that flee the cursor and gather under a long press. The build that was live until the 3D planet (v1) replaced it is preserved here, still fully playable.",
    },
    image: "/images/portfolio_v0.webp",
    tags: ["Next.js", "React", "Tailwind CSS", "Framer Motion"],
    category: "WEB",
    status: "Public",
    // Built from the last commit main had before v1 was merged; see
    // docs/structure.md.
    githubUrl: "https://github.com/miiiwa1121/miwa_portfolio/tree/v0-dark-neon",
    demoUrl: "/archive/v0",
  },
  {
    slug: "reallog",
    title: { ja: "Reallog", en: "Reallog" },
    description: {
      ja: "この期間の思い出を、みんなで一つに。固定グループ（カップル・仲間・チーム・家族・学級など）が、1日に一回、写真/動画/文字を投稿してためていくクローズドSNS。",
      en: "Make memories of this period into one together. A closed SNS where a fixed group (couples, friends, teams, families, classes, etc.) posts photos/videos/text once a day to save memories.",
    },
    image: "/images/coming_soon.png",
    tags: ["Concept"],
    category: "APP",
    status: "dev",
    githubUrl: "#",
    demoUrl: "#",
  },
  {
    slug: "thanks-log",
    title: { ja: "thanks-log", en: "thanks-log" },
    description: {
      ja: "特定の人への“ありがとう”を贈るアルバムアプリのプロトタイプ。（Reallogの前身プロジェクト）",
      en: 'A prototype album app for sending "thank you"s to a specific person. (The predecessor project to Reallog)',
    },
    image: "/images/coming_soon.png",
    tags: ["Prototype"],
    category: "APP",
    status: "dev",
    githubUrl: "#",
    demoUrl: "#",
  },
];
