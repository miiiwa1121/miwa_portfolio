"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import SectionHeading from "./SectionHeading";

interface DetailSectionProps {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}

export default function DetailSection({ id, title, children, className = "" }: DetailSectionProps) {
  return (
    <section id={id} className={`py-16 md:py-24 relative z-10 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <SectionHeading className="mb-10 md:mb-14">{title}</SectionHeading>
          {children}
        </motion.div>
      </div>
    </section>
  );
}
