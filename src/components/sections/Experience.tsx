"use client";

import Section from "@/components/Section";
import { motion } from "framer-motion";
import { useLanguage } from "../LanguageContext";

const experiencesJP = [
  {
    year: "2019",
    title: "コンピュータの世界への覚醒",
    description: "漫画『王様達のヴァイキング』を読んだことをきっかけに、コード一つで世界と対峙するサイバー空間の可能性に衝撃を受け、コンピュータとプログラミングの世界へ強く惹きつけられる。",
  },
  {
    year: "2020",
    title: "情報系高校へ入学",
    description: "プログラミングを本格的に学びたいという思いから、情報系の高校へ進学。単なる興味から、専門的な知識と技術を身につけるための学習をスタートする。",
  },
  {
    year: "2021",
    title: "C言語を通じた基礎の確立",
    description: "C言語を主軸に、アルゴリズムやメモリ管理などプログラミングの基礎を徹底的に習得。コンピュータの本質的な動作原理の理解を深める。",
  },
  {
    year: "2023",
    title: "Pythonとの出会い",
    description: "Pythonに触れたことで、柔軟かつスピーディーにアイデアを形にする楽しさを知る。開発の幅が広がり、プログラミングへの熱がさらに加速する。",
  },
  {
    year: "2024",
    title: "42tokyoへ入学",
    description: "実践的な課題解決能力を求めてエンジニア養成機関「42tokyo」に入学。ピアラーニング環境のもと、熱量高い仲間たちと共に自走力とソフトウェアエンジニアリングを深く学ぶ。",
  },
  {
    year: "2025",
    title: "データサイエンス領域への挑戦",
    description: "東京大学松尾研究室のGCI 2025（グローバル消費インテリジェンス寄付講座）を修了。データサイエンスやAI技術の知見を深め、自身のエンジニアリングスキルの幅を大きく広げる。",
  },
  {
    year: "2025.05",
    title: "産学連携プロジェクトの完遂",
    description: "産学連携プロジェクトのリーダーとしてチーム開発を牽引。実社会の課題解決に向けたアプローチを実践し、翌年2月の最終発表に向けてプロジェクトを完遂させる。",
  },
  {
    year: "2025.08",
    title: "「imadoko」の開発",
    description: "学んだ技術を活かした個人開発を本格化。要件定義から実装までを一人で完遂し、最初の本格的なプロダクトとなる「imadoko」を開発。",
  },
  {
    year: "2025.11",
    title: "エンジニアインターンの開始",
    description: "実務レベルでの技術力向上を目指し、エンジニアとしてインターンシップを開始。現場でのチーム開発やコード品質、ビジネス視点での開発手法を実践的に吸収する。",
  },
  {
    year: "2025.12",
    title: "「Sukima Park」のアーキテクチャ設計",
    description: "P2Pスペースシェアリングプラットフォーム「Sukima Park」の開発を推進。モダンな技術選定を行い、要件定義からアーキテクチャ設計に深く取り組む。",
  },
  {
    year: "2026.04",
    title: "「mesen」の開発・リリース",
    description: "新たな個人プロダクト「mesen」を開発しリリース。これまでの学びを活かし、ユーザー体験（UX）やモダンな技術スタックを意識した開発を行う。",
  },
  {
    year: "2026.07",
    title: "「Umoja」の開発（現在）",
    description: "さらなる技術的チャレンジとして、新サービス「Umoja」を開発中。これまでの経験を総動員し、より価値のあるプロダクトの創出を目指す。",
  }
];

const experiencesEN = [
  {
    year: "2019",
    title: "Awakening to the Computer World",
    description: "Inspired by the manga \"Kings' Viking\", I was shocked by the possibility of confronting the world with just a single piece of code in cyberspace, which strongly drew me to the world of computers and programming.",
  },
  {
    year: "2020",
    title: "Entered IT High School",
    description: "Entered an IT-focused high school with a strong desire to learn programming seriously. Transitioned from mere interest to starting specialized learning to acquire knowledge and skills.",
  },
  {
    year: "2021",
    title: "Establishing Basics via C Language",
    description: "Mastered programming basics centering on C language, including algorithms and memory management. Deepened my understanding of the fundamental operating principles of computers.",
  },
  {
    year: "2023",
    title: "Encounter with Python",
    description: "Discovered the joy of flexibly and quickly shaping ideas through Python. It expanded my development scope and further accelerated my passion for programming.",
  },
  {
    year: "2024",
    title: "Entered 42tokyo",
    description: "Entered \"42tokyo\", an engineering institution, seeking practical problem-solving skills. Deeply learning software engineering and self-driven learning with highly passionate peers in a peer-learning environment.",
  },
  {
    year: "2025",
    title: "Challenge in Data Science",
    description: "Completed the GCI 2025 (Global Consumer Intelligence) program by Matsuo Lab at the University of Tokyo. Deepened my knowledge of data science and AI technologies, significantly expanding my engineering skillset.",
  },
  {
    year: "2025.05",
    title: "Completed Industry-Academia Project",
    description: "Led team development as the leader of an industry-academia collaboration project. Practiced approaches to solving real-world problems and successfully completed the project leading up to the final presentation in February of the following year.",
  },
  {
    year: "2025.08",
    title: "Developed \"imadoko\"",
    description: "Started full-scale personal development utilizing the acquired skills. Completed everything from requirements definition to implementation alone, developing the first serious product \"imadoko\".",
  },
  {
    year: "2025.11",
    title: "Started Engineering Internship",
    description: "Started an internship as an engineer aiming to improve technical skills at a practical level. Practically absorbing team development, code quality, and business-perspective development methodologies on-site.",
  },
  {
    year: "2025.12",
    title: "Architecture Design for \"Sukima Park\"",
    description: "Promoted the development of \"Sukima Park\", a P2P space-sharing platform. Made modern technology selections and deeply engaged in everything from requirements definition to architecture design.",
  },
  {
    year: "2026.04",
    title: "Developed & Released \"mesen\"",
    description: "Developed and released a new personal product \"mesen\". Leveraging previous learnings, focused on User Experience (UX) and modern tech stacks.",
  },
  {
    year: "2026.07",
    title: "Developing \"Umoja\" (Current)",
    description: "Currently developing a new service \"Umoja\" as a further technical challenge. Aiming to create a more valuable product by mobilizing all my past experiences.",
  }
];

export default function Experience() {
  const { language } = useLanguage();
  const experiences = language === "ja" ? experiencesJP : experiencesEN;
  
  return (
    <Section id="experience" title="Experience">
      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--primary)] before:via-[var(--secondary)] before:to-transparent">
        {experiences.map((exp, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#050505] bg-[var(--primary)] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
              <div className="w-2 h-2 bg-[#050505] rounded-full" />
            </div>
            
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-[var(--primary)]/50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-2">
                <h3 className="font-bold text-white text-xl">{exp.title}</h3>
                <span className="text-[var(--primary)] font-mono text-sm font-semibold bg-[var(--primary)]/10 px-3 py-1 rounded-full w-fit">{exp.year}</span>
              </div>
              <p className="text-gray-400 leading-relaxed">{exp.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
