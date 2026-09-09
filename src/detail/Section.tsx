"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SectionProps {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}

export default function Section({ id, title, children, className = "" }: SectionProps) {
  return (
    <section id={id} className={`py-16 md:py-24 relative z-10 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-10 md:mb-14">
            <span className="w-2.5 h-8 sm:h-9 bg-orange-600 rounded-full inline-block" />
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-950">
              {title}
            </h2>
          </div>
          {children}
        </motion.div>
      </div>
    </section>
  );
}
