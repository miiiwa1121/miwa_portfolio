"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import DetailSection from "./DetailSection";
import { useLanguage } from "@/state/LanguageContext";
import { PROJECTS, localizeProjects, type Project } from "@/data";
import {
  filterProjects,
  type CategoryFilter,
  type StatusFilter,
} from "./products/catalog";
import ProductFilters from "./products/ProductFilters";
import ProjectCard from "./products/ProjectCard";
import ProjectModal from "./products/ProjectModal";
import Toast from "./products/Toast";
import { useToast } from "./products/useToast";
import type { BlockedLink } from "./products/ProjectLinks";

export default function Products() {
  const { language } = useLanguage();
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [selected, setSelected] = useState<Project | null>(null);
  const toast = useToast();

  // createPortal needs a real container, and the page is statically
  // prerendered, so there is none during the server pass. No mounted-flag
  // state is needed: both portal slots are empty on the first client render,
  // so hydration adds no markup to <body> and has nothing to mismatch.
  const portalTarget = typeof document === "undefined" ? null : document.body;

  const visible = useMemo(
    () => filterProjects(localizeProjects(PROJECTS, language), category, status),
    [language, category, status]
  );

  // Keep the page behind the dialog from scrolling under it.
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selected]);

  const handleBlockedLink = (kind: BlockedLink) => {
    if (kind === "code") {
      toast.show(language === "ja" ? "これは秘密だぜ🤫" : "This is a secret🤫");
    } else {
      toast.show("Coming soon ...");
    }
  };

  return (
    <DetailSection id="products" title="Products">
      <ProductFilters
        category={category}
        status={status}
        onCategoryChange={setCategory}
        onStatusChange={setStatus}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 transition-all duration-500">
        {visible.map((project) => (
          <ProjectCard
            key={project.slug}
            project={project}
            onOpen={setSelected}
            onBlockedLink={handleBlockedLink}
          />
        ))}
      </div>

      {portalTarget &&
        createPortal(
          <>
            <AnimatePresence>
              {toast.message && <Toast>{toast.message}</Toast>}
            </AnimatePresence>
            <AnimatePresence>
              {selected && (
                <ProjectModal
                  project={selected}
                  onClose={() => setSelected(null)}
                  onBlockedLink={handleBlockedLink}
                />
              )}
            </AnimatePresence>
          </>,
          portalTarget
        )}
    </DetailSection>
  );
}
