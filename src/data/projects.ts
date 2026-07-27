import type { ProjectSource } from "./types";

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
    image: "/images/project_placeholder.webp",
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
      en: '"Some things can\'t be understood through text." A platform that evaluates online group discussions (GD) and allows participants to send evaluation data to companies at their own discretion.',
    },
    image: "/images/project_placeholder.webp",
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
    image: "/images/imadoko.webp",
    tags: ["Next.js", "Supabase", "Tailwind CSS", "Leaflet"],
    category: "WEB",
    status: "Public",
    githubUrl: "#",
    demoUrl: "https://imadoko.link",
  },
  {
    slug: "mesen",
    title: { ja: "mesen", en: "mesen" },
    description: {
      ja: "視線推定・顔認識を行い、結果をGIFやMP4で出力できるWebアプリケーションです。MediaPipeを用いてブラウザ上で動作します。",
      en: "A web application that performs gaze estimation and face recognition, and can output the results as GIF or MP4. It runs on the browser using MediaPipe.",
    },
    image: "/images/mesen.webp",
    tags: ["Next.js", "MediaPipe", "Tailwind CSS"],
    category: "WEB",
    status: "Public",
    githubUrl: "#",
    demoUrl: "https://mesen.miiiwa.workers.dev/",
  },
  {
    slug: "reallog",
    title: { ja: "Reallog", en: "Reallog" },
    description: {
      ja: "この期間の思い出を、みんなで一つに。固定グループ（カップル・仲間・チーム・家族・学級など）が、1日に一回、写真/動画/文字を投稿してためていくクローズドSNS。",
      en: "Make memories of this period into one together. A closed SNS where a fixed group (couples, friends, teams, families, classes, etc.) posts photos/videos/text once a day to save memories.",
    },
    image: "/images/project_placeholder.webp",
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
    image: "/images/project_placeholder.webp",
    tags: ["Prototype"],
    category: "APP",
    status: "dev",
    githubUrl: "#",
    demoUrl: "#",
  },
  {
    slug: "sound-card-game",
    title: { ja: "音階神経衰弱", en: "Sound Memory Game" },
    description: {
      ja: "音を頼りに同じ音階のカードペアを探す神経衰弱（メモリー）ゲームです。カードをめくると音階が鳴ります。",
      en: "A memory game where you rely on sound to find matching card pairs of the same musical scale. When you flip a card, a musical scale is played.",
    },
    image: "/images/音階神経衰弱.webp",
    tags: ["Next.js", "React", "Web Audio API"],
    category: "WEB",
    status: "Public",
    githubUrl: "https://github.com/miiiwa1121/sound_card_game",
    demoUrl: "https://sound-card-game.miiiwa.workers.dev/",
  },
  {
    slug: "vegetable-card-game",
    title: { ja: "野菜神経衰弱", en: "Vegetable Memory Game" },
    description: {
      ja: "野菜画像を使ったメモリーカードゲーム（神経衰弱）です。",
      en: "A memory card game (concentration) using vegetable images.",
    },
    image: "/images/野菜神経衰弱.webp",
    tags: ["Next.js", "React", "CSS Modules"],
    category: "WEB",
    status: "Public",
    githubUrl: "https://github.com/miiiwa1121/vegetable_card_game",
    demoUrl: "https://vegetable-card-game.miiiwa.workers.dev/",
  },
];
