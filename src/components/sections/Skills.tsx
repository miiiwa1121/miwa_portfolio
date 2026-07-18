"use client";

import Section from "@/components/Section";
import { motion } from "framer-motion";
import {
  SiHtml5, SiCss, SiJavascript, SiTypescript,
  SiReact, SiNextdotjs, SiTailwindcss,
  SiNodedotjs, SiGit, SiGithub, SiFigma,
  SiPython, SiC, SiPhp, SiDart, SiLaravel,
  SiMysql, SiSqlite, SiFlutter, SiSupabase,
  SiCloudflare, SiVercel, SiGooglecloud,
  SiCypress, SiPostgresql, SiSwift, SiAnthropic
} from "react-icons/si";
import { FaJava, FaAws } from "react-icons/fa6";
import { TbBrandCSharp } from "react-icons/tb";

const skills = [
  { name: "HTML", icon: SiHtml5, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg", color: "#E34F26" },
  { name: "CSS", icon: SiCss, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg", color: "#1572B6" },
  { name: "JavaScript", icon: SiJavascript, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg", color: "#F7DF1E" },
  { name: "TypeScript", icon: SiTypescript, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg", color: "#3178C6" },
  { name: "Python", icon: SiPython, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg", color: "#3776AB" },
  { name: "C", icon: SiC, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/c/c-original.svg", color: "#A8B9CC" },
  { name: "C#", icon: TbBrandCSharp, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg", color: "#239120" },
  { name: "Java", icon: FaJava, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg", color: "#5382A1" },
  { name: "PHP", icon: SiPhp, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/php/php-original.svg", color: "#777BB4" },
  { name: "Dart", icon: SiDart, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/dart/dart-original.svg", color: "#0175C2" },
  { name: "Swift", icon: SiSwift, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/swift/swift-original.svg", color: "#F05138" },
  { name: "React", icon: SiReact, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg", color: "#61DAFB" },
  { name: "Next.js", icon: SiNextdotjs, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-original.svg", color: "#000000" },
  { name: "Tailwind CSS", icon: SiTailwindcss, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg", color: "#06B6D4" },
  { name: "Laravel", icon: SiLaravel, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/laravel/laravel-original.svg", color: "#FF2D20" },
  { name: "Flutter", icon: SiFlutter, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/flutter/flutter-original.svg", color: "#02569B" },
  { name: "Node.js", icon: SiNodedotjs, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg", color: "#339933" },
  { name: "MySQL", icon: SiMysql, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mysql/mysql-original.svg", color: "#4479A1" },
  { name: "PostgreSQL", icon: SiPostgresql, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg", color: "#4169E1" },
  { name: "SQLite", icon: SiSqlite, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/sqlite/sqlite-original.svg", color: "#003B57" },
  { name: "Supabase", icon: SiSupabase, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/supabase/supabase-original.svg", color: "#3ECF8E" },
  { name: "Git", icon: SiGit, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg", color: "#F05032" },
  { name: "GitHub", icon: SiGithub, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original.svg", color: "#000000" },
  { name: "Cypress", icon: SiCypress, color: "#04C38E" },
  { name: "AWS", icon: FaAws, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/amazonwebservices/amazonwebservices-original-wordmark.svg", color: "#FF9900" },
  { name: "GCP", icon: SiGooglecloud, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/googlecloud/googlecloud-original.svg", color: "#4285F4" },
  { name: "Cloudflare", icon: SiCloudflare, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cloudflare/cloudflare-original.svg", color: "#F38020" },
  { name: "Vercel", icon: SiVercel, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vercel/vercel-original.svg", color: "#000000" },
  { name: "Figma", icon: SiFigma, imageSrc: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/figma/figma-original.svg", color: "#F24E1E" },
  { name: "Claude", icon: SiAnthropic, color: "#D97757" }
];

export default function Skills() {
  return (
    <Section id="skills" title="Skills">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {skills.map((skill, index) => {
          const Icon = skill.icon;
          return (
            <motion.div
              key={skill.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (index % 6) * 0.05 }}
              whileHover={{ y: -5, scale: 1.05 }}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[var(--hover-color)] hover:shadow-[0_0_20px_var(--hover-color-alpha)] transition-all duration-300 cursor-default backdrop-blur-md group"
              style={{
                '--hover-color': skill.color,
                '--hover-color-alpha': `${skill.color}33` // 20% opacity hex
              } as React.CSSProperties}
            >
              {skill.imageSrc ? (
                <img
                  src={skill.imageSrc}
                  alt={skill.name}
                  className="w-12 h-12 mb-4 transition-all duration-300 group-hover:scale-110 grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100"
                />
              ) : (
                <Icon
                  size={48}
                  className="mb-4 transition-all duration-300 group-hover:scale-110 text-gray-400 group-hover:text-[var(--hover-color)]"
                />
              )}
              <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">
                {skill.name}
              </span>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}
