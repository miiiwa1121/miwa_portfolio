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
  { name: "HTML", icon: SiHtml5, color: "#E34F26" },
  { name: "CSS", icon: SiCss, color: "#1572B6" },
  { name: "JavaScript", icon: SiJavascript, color: "#F7DF1E" },
  { name: "TypeScript", icon: SiTypescript, color: "#3178C6" },
  { name: "Python", icon: SiPython, color: "#3776AB" },
  { name: "C", icon: SiC, color: "#A8B9CC" },
  { name: "C#", icon: TbBrandCSharp, color: "#239120" },
  { name: "Java", icon: FaJava, color: "#5382A1" },
  { name: "PHP", icon: SiPhp, color: "#777BB4" },
  { name: "Dart", icon: SiDart, color: "#0175C2" },
  { name: "React", icon: SiReact, color: "#61DAFB" },
  { name: "Next.js", icon: SiNextdotjs, color: "#ffffff" },
  { name: "Tailwind CSS", icon: SiTailwindcss, color: "#06B6D4" },
  { name: "Laravel", icon: SiLaravel, color: "#FF2D20" },
  { name: "Flutter", icon: SiFlutter, color: "#02569B" },
  { name: "Node.js", icon: SiNodedotjs, color: "#339933" },
  { name: "MySQL", icon: SiMysql, color: "#4479A1" },
  { name: "PostgreSQL", icon: SiPostgresql, color: "#4169E1" },
  { name: "SQLite", icon: SiSqlite, color: "#003B57" },
  { name: "Supabase", icon: SiSupabase, color: "#3ECF8E" },
  { name: "Git", icon: SiGit, color: "#F05032" },
  { name: "GitHub", icon: SiGithub, color: "#ffffff" },
  { name: "Swift", icon: SiSwift, color: "#F05138" },
  { name: "Cypress", icon: SiCypress, color: "#04C38E" },
  { name: "AWS", icon: FaAws, color: "#FF9900" },
  { name: "GCP", icon: SiGooglecloud, color: "#4285F4" },
  { name: "Cloudflare", icon: SiCloudflare, color: "#F38020" },
  { name: "Vercel", icon: SiVercel, color: "#ffffff" },
  { name: "Figma", icon: SiFigma, color: "#F24E1E" },
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
              <Icon 
                size={48} 
                className="mb-4 text-gray-400 group-hover:text-[var(--hover-color)] transition-colors duration-300"
              />
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
