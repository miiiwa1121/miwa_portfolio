"use client";

import Section from "@/components/Section";
import { motion } from "framer-motion";

const skills = [
  "HTML / CSS", "JavaScript", "TypeScript", "React", "Next.js", 
  "Tailwind CSS", "Framer Motion", "Node.js", "Git / GitHub", "Figma"
];

export default function Skills() {
  return (
    <Section id="skills" title="Skills">
      <div className="flex flex-wrap gap-4">
        {skills.map((skill, index) => (
          <motion.div
            key={skill}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -5, scale: 1.05 }}
            className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-gray-200 font-medium hover:border-[var(--primary)] hover:text-white hover:bg-[var(--primary)]/10 transition-all cursor-default backdrop-blur-md"
          >
            {skill}
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
