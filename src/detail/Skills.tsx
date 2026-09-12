"use client";

import { useState } from "react";
import DetailSection from "./DetailSection";
import { motion } from "framer-motion";
import { useLanguage } from "@/state/LanguageContext";
import { useHandheld } from "@/state/useHandheld";
import {
  SiHtml5, SiCss, SiJavascript, SiTypescript,
  SiReact, SiNextdotjs, SiTailwindcss,
  SiNodedotjs, SiGit, SiGithub, SiFigma,
  SiPython, SiC, SiPhp, SiDart, SiLaravel,
  SiMysql, SiSqlite, SiFlutter, SiSupabase,
  SiCloudflare, SiVercel, SiGooglecloud,
  SiCypress, SiPostgresql, SiSwift, SiAnthropic,
  SiGooglegemini
} from "react-icons/si";
import { FaJava, FaAws } from "react-icons/fa6";
import { TbBrandCSharp, TbBrandOpenai } from "react-icons/tb";
import type { IconType } from "react-icons";

type SkillItem = {
  name: string;
  icon: IconType;
  color: string;
};

type SkillCategory = {
  id: string;
  titleJa: string;
  titleEn: string;
  descriptionJa: string;
  descriptionEn: string;
  skills: SkillItem[];
};

const CATEGORIES: SkillCategory[] = [
  {
    id: "frontend",
    titleJa: "フロントエンド",
    titleEn: "Frontend",
    descriptionJa: "モダンなUI/UX、デザインシステム、インタラクティブWebの構築",
    descriptionEn: "Modern UI/UX, design systems & interactive web development",
    skills: [
      { name: "TypeScript", icon: SiTypescript, color: "#3178C6" },
      { name: "JavaScript", icon: SiJavascript, color: "#F7DF1E" },
      { name: "React", icon: SiReact, color: "#61DAFB" },
      { name: "Next.js", icon: SiNextdotjs, color: "#000000" },
      { name: "Tailwind CSS", icon: SiTailwindcss, color: "#06B6D4" },
      { name: "HTML5", icon: SiHtml5, color: "#E34F26" },
      { name: "CSS3", icon: SiCss, color: "#1572B6" },
    ],
  },
  {
    id: "backend",
    titleJa: "バックエンド & 言語",
    titleEn: "Backend & Languages",
    descriptionJa: "Webバックエンド、アルゴリズム、低レイヤからスクリプトまで",
    descriptionEn: "Web backends, algorithms, from low-level systems to scripting",
    skills: [
      { name: "Node.js", icon: SiNodedotjs, color: "#339933" },
      { name: "Python", icon: SiPython, color: "#3776AB" },
      { name: "PHP", icon: SiPhp, color: "#777BB4" },
      { name: "Laravel", icon: SiLaravel, color: "#FF2D20" },
      { name: "Java", icon: FaJava, color: "#5382A1" },
      { name: "C", icon: SiC, color: "#A8B9CC" },
      { name: "C#", icon: TbBrandCSharp, color: "#239120" },
    ],
  },
  {
    id: "mobile",
    titleJa: "モバイル & アプリ",
    titleEn: "Mobile & Native",
    descriptionJa: "クロスプラットフォーム開発およびネイティブ開発",
    descriptionEn: "Cross-platform mobile apps & native development",
    skills: [
      { name: "Flutter", icon: SiFlutter, color: "#02569B" },
      { name: "Dart", icon: SiDart, color: "#0175C2" },
      { name: "Swift", icon: SiSwift, color: "#F05138" },
    ],
  },
  {
    id: "database",
    titleJa: "データベース",
    titleEn: "Databases",
    descriptionJa: "リレーショナルDBからBaaS、データモデリングまで",
    descriptionEn: "RDBMS, BaaS platforms & data modeling",
    skills: [
      { name: "PostgreSQL", icon: SiPostgresql, color: "#4169E1" },
      { name: "MySQL", icon: SiMysql, color: "#4479A1" },
      { name: "SQLite", icon: SiSqlite, color: "#003B57" },
      { name: "Supabase", icon: SiSupabase, color: "#3ECF8E" },
    ],
  },
  {
    id: "cloud",
    titleJa: "クラウド",
    titleEn: "Cloud",
    descriptionJa: "クラウドインフラ、エッジサーバーレス、ホスティング環境",
    descriptionEn: "Cloud infrastructure, serverless edge & hosting platforms",
    skills: [
      { name: "AWS", icon: FaAws, color: "#FF9900" },
      { name: "GCP", icon: SiGooglecloud, color: "#4285F4" },
      { name: "Cloudflare", icon: SiCloudflare, color: "#F38020" },
      { name: "Vercel", icon: SiVercel, color: "#000000" },
    ],
  },
  {
    id: "tools",
    titleJa: "ツール",
    titleEn: "Tools",
    descriptionJa: "バージョン管理、テスト、デザインツール",
    descriptionEn: "Version control, testing & UI/UX design tooling",
    skills: [
      { name: "Git", icon: SiGit, color: "#F05032" },
      { name: "GitHub", icon: SiGithub, color: "#000000" },
      { name: "Cypress", icon: SiCypress, color: "#04C38E" },
      { name: "Figma", icon: SiFigma, color: "#F24E1E" },
    ],
  },
  {
    id: "ai",
    titleJa: "AI",
    titleEn: "AI",
    descriptionJa: "LLM API、プロンプトエンジニアリング、AI搭載アプリ開発",
    descriptionEn: "LLM integration, prompt engineering & AI-assisted development",
    skills: [
      { name: "Claude", icon: SiAnthropic, color: "#D97757" },
      { name: "Gemini", icon: SiGooglegemini, color: "#8E75FF" },
      { name: "ChatGPT", icon: TbBrandOpenai, color: "#10A37F" },
    ],
  },
];

export default function Skills() {
  const { language } = useLanguage();
  const isJa = language === "ja";

  // A tile's own colour is otherwise only ever reachable by hovering it, which
  // a phone cannot do — the whole grid stays grey there. A tap lights one
  // instead, and lights only one: hover shows a single tile at a time because
  // a pointer is in a single place, and keeping that true is what stops the
  // grid from turning into a scratch card as you read down it.
  const handheld = useHandheld();
  const [litSkill, setLitSkill] = useState<string | null>(null);

  return (
    <DetailSection id="skills" title="Skills">
      <div className="space-y-12">
        {CATEGORIES.map((cat, catIdx) => (
          <div key={cat.id} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-black/5 pb-2">
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-bold text-gray-900">
                  {isJa ? cat.titleJa : cat.titleEn}
                </h3>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200/50">
                  {cat.skills.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                {isJa ? cat.descriptionJa : cat.descriptionEn}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
              {cat.skills.map((skill, skillIdx) => {
                const Icon = skill.icon;
                const lit = handheld && litSkill === skill.name;
                return (
                  <motion.div
                    key={skill.name}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: catIdx * 0.05 + skillIdx * 0.02, duration: 0.3 }}
                    whileHover={{ y: -3 }}
                    // Bound only on a phone. On a pointer screen the hover
                    // styles below already say this, and a tap that latched a
                    // tile lit would leave it fighting the hover it sits under.
                    onClick={
                      handheld
                        ? () => setLitSkill((current) => (current === skill.name ? null : skill.name))
                        : undefined
                    }
                    className={`flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white border shadow-sm transition-all duration-200 cursor-default group ${
                      lit
                        ? "border-[var(--hover-color)] shadow-md"
                        : "border-black/5 hover:border-[var(--hover-color)] hover:shadow-md"
                    }`}
                    style={{ "--hover-color": skill.color } as React.CSSProperties}
                  >
                    <Icon
                      className={`w-8 h-8 sm:w-10 sm:h-10 mb-2.5 transition-transform duration-200 ${
                        lit
                          ? "scale-110 text-[var(--hover-color)]"
                          : "text-gray-400 group-hover:scale-110 group-hover:text-[var(--hover-color)]"
                      }`}
                    />
                    <span
                      className={`text-xs sm:text-sm font-bold transition-colors text-center leading-tight ${
                        lit ? "text-gray-950" : "text-gray-700 group-hover:text-gray-950"
                      }`}
                    >
                      {skill.name}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </DetailSection>
  );
}
