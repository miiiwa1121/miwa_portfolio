import type { Localized } from "./projectModel";

export type ExperienceSource = {
  /** "2025" or "2025.08", shown as written. Entries are in this order. */
  period: string;
  title: Localized<string>;
  description: Localized<string>;
  /**
   * The Products entry this milestone opens, by slug. Tapping the milestone
   * switches to Products with that project's modal already open.
   */
  project?: string;
};

/**
 * The Experience timeline, oldest first.
 *
 * One entry per milestone, like `PROJECTS` — it used to be two parallel arrays,
 * one per language, each repeating every period.
 */
export const EXPERIENCE: ExperienceSource[] = [
  {
    period: "2019",
    title: { ja: "コンピュータの世界への覚醒", en: "Awakening to the Computer World" },
    description: {
      ja: "漫画『王様達のヴァイキング』を読んだことをきっかけに、コード一つで世界と対峙するサイバー空間の可能性に衝撃を受け、コンピュータとプログラミングの世界へ強く惹きつけられる。",
      en: "Inspired by the manga \"Kings' Viking\", I was shocked by the possibility of confronting the world with just a single piece of code in cyberspace, which strongly drew me to the world of computers and programming.",
    },
  },
  {
    period: "2020",
    title: { ja: "情報系高校へ入学", en: "Entered IT High School" },
    description: {
      ja: "プログラミングを本格的に学びたいという思いから、情報系の高校へ進学。単なる興味から、専門的な知識と技術を身につけるための学習をスタートする。",
      en: "Entered an IT-focused high school with a strong desire to learn programming seriously. Transitioned from mere interest to starting specialized learning to acquire knowledge and skills.",
    },
  },
  {
    period: "2021",
    title: { ja: "C言語を通じた基礎の確立", en: "Establishing Basics via C Language" },
    description: {
      ja: "C言語を主軸に、アルゴリズムやメモリ管理などプログラミングの基礎を徹底的に習得。コンピュータの本質的な動作原理の理解を深める。",
      en: "Mastered programming basics centering on C language, including algorithms and memory management. Deepened my understanding of the fundamental operating principles of computers.",
    },
  },
  {
    period: "2023",
    title: { ja: "Pythonとの出会い", en: "Encounter with Python" },
    description: {
      ja: "Pythonに触れたことで、柔軟かつスピーディーにアイデアを形にする楽しさを知る。開発の幅が広がり、プログラミングへの熱がさらに加速する。",
      en: "Discovered the joy of flexibly and quickly shaping ideas through Python. It expanded my development scope and further accelerated my passion for programming.",
    },
  },
  {
    period: "2024",
    title: { ja: "42tokyoへ入学", en: "Entered 42tokyo" },
    description: {
      ja: "実践的な課題解決能力を求めてエンジニア養成機関「42tokyo」に入学。ピアラーニング環境のもと、熱量高い仲間たちと共に自走力とソフトウェアエンジニアリングを深く学ぶ。",
      en: "Entered \"42tokyo\", an engineering institution, seeking practical problem-solving skills. Deeply learning software engineering and self-driven learning with highly passionate peers in a peer-learning environment.",
    },
  },
  {
    period: "2025",
    title: { ja: "データサイエンス領域への挑戦", en: "Challenge in Data Science" },
    description: {
      ja: "東京大学松尾研究室のGCI 2025（グローバル消費インテリジェンス寄付講座）を修了。データサイエンスやAI技術の知見を深め、自身のエンジニアリングスキルの幅を大きく広げる。",
      en: "Completed the GCI 2025 (Global Consumer Intelligence) program by Matsuo Lab at the University of Tokyo. Deepened my knowledge of data science and AI technologies, significantly expanding my engineering skillset.",
    },
  },
  {
    period: "2025.05",
    title: { ja: "産学連携プロジェクトの完遂", en: "Completed Industry-Academia Project" },
    description: {
      ja: "産学連携プロジェクトのリーダーとしてチーム開発を牽引。実社会の課題解決に向けたアプローチを実践し、翌年2月の最終発表に向けてプロジェクトを完遂させる。",
      en: "Led team development as the leader of an industry-academia collaboration project. Practiced approaches to solving real-world problems and successfully completed the project leading up to the final presentation in February of the following year.",
    },
  },
  {
    period: "2025.08",
    title: { ja: "「imadoko」の開発", en: "Developed \"imadoko\"" },
    description: {
      ja: "学んだ技術を活かした個人開発を本格化。要件定義から実装までを一人で完遂し、最初の本格的なプロダクトとなる「imadoko」を開発。",
      en: "Started full-scale personal development utilizing the acquired skills. Completed everything from requirements definition to implementation alone, developing the first serious product \"imadoko\".",
    },
    project: "imadoko",
  },
  {
    period: "2025.11",
    title: { ja: "エンジニアインターンの開始", en: "Started Engineering Internship" },
    description: {
      ja: "実務レベルでの技術力向上を目指し、エンジニアとしてインターンシップを開始。現場でのチーム開発やコード品質、ビジネス視点での開発手法を実践的に吸収する。",
      en: "Started an internship as an engineer aiming to improve technical skills at a practical level. Practically absorbing team development, code quality, and business-perspective development methodologies on-site.",
    },
  },
  {
    period: "2025.12",
    title: { ja: "「Sukima Park」のアーキテクチャ設計", en: "Architecture Design for \"Sukima Park\"" },
    description: {
      ja: "P2Pスペースシェアリングプラットフォーム「Sukima Park」の開発を推進。モダンな技術選定を行い、要件定義からアーキテクチャ設計に深く取り組む。",
      en: "Promoted the development of \"Sukima Park\", a P2P space-sharing platform. Made modern technology selections and deeply engaged in everything from requirements definition to architecture design.",
    },
  },
  {
    period: "2026.04",
    title: { ja: "「mesen」の開発・リリース", en: "Developed & Released \"mesen\"" },
    description: {
      ja: "新たな個人プロダクト「mesen」を開発しリリース。これまでの学びを活かし、ユーザー体験（UX）やモダンな技術スタックを意識した開発を行う。",
      en: "Developed and released a new personal product \"mesen\". Leveraging previous learnings, focused on User Experience (UX) and modern tech stacks.",
    },
    // Renamed Michaw in 2026.08 (below); the slug kept the original name.
    project: "mesen",
  },
  {
    period: "2026.07",
    title: { ja: "ポートフォリオサイトの公開", en: "Launched This Portfolio (v0)" },
    description: {
      ja: "このポートフォリオサイトの初代（v0）を公開。黒地にネオンのグラデーションを重ね、カーソルに反応するパーティクルを敷いた、1ページ縦スクロールのサイトから始まる。",
      en: "Launched the first version of this portfolio site: a single scrolling page of neon gradients on black, over a field of particles that react to the cursor.",
    },
    project: "portfolio-v0",
  },
  {
    period: "2026.07",
    title: { ja: "「Synesthesium」の公開", en: "Released \"Synesthesium\"" },
    description: {
      ja: "音階・色覚・モールス・リズムなど、さまざまな感覚を研ぎ澄ます神経衰弱ゲームのコレクション「Synesthesium」を公開。ブラウザだけで、誰でも無料で遊べる形にする。",
      en: "Released \"Synesthesium\", a collection of memory-matching games that sharpen the senses — pitch, color perception, Morse code, rhythm and more — free to play in any browser.",
    },
    project: "synesthesium",
  },
  {
    period: "2026.07",
    title: { ja: "「Umoja」の開発", en: "Developing \"Umoja\"" },
    description: {
      ja: "さらなる技術的チャレンジとして、新サービス「Umoja」を開発中。これまでの経験を総動員し、より価値のあるプロダクトの創出を目指す。",
      en: "Currently developing a new service \"Umoja\" as a further technical challenge. Aiming to create a more valuable product by mobilizing all my past experiences.",
    },
  },
  {
    period: "2026.08",
    title: { ja: "「mesen」から「Michaw」へ", en: "\"mesen\" Reborn as \"Michaw\"" },
    description: {
      ja: "「mesen」を「Michaw（見ちゃう）」として作り直す。視線推定の結果をGIF・MP4に書き出すツールから、画像の中の「つい見てしまう場所」を見てしまうまでの時間を計測するゲームへと遊び方を変え、Cloudflare D1を加えて独自ドメイン（michaw.miiiwa.com）へ移す。",
      en: "Rebuilt \"mesen\" as \"Michaw\". It changed from a tool that exports gaze-estimation results as GIF/MP4 into a game that measures how long it takes before you look at the irresistible spot in an image, gaining Cloudflare D1 and moving to its own domain (michaw.miiiwa.com).",
    },
    project: "mesen",
  },
  {
    period: "2026.09",
    title: { ja: "ポートフォリオを3Dの惑星へ刷新", en: "Rebuilt the Portfolio in 3D (v1)" },
    description: {
      ja: "ポートフォリオサイトを、Three.jsで手続き的に生成したボクセルの惑星へ全面的に作り替える（v1）。惑星上の建物をカメラで巡って各セクションを開く、3DとHTMLのハイブリッド構成にする。",
      en: "Rebuilt this portfolio as a voxel planet generated procedurally with Three.js (v1): a 3D/HTML hybrid where the camera tours the buildings on the planet to open each section.",
    },
    project: "portfolio-v1",
  },
];
