"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { GithubIcon } from "@/ui/icons";
import type { Project } from "@/data";
import { isPlaceholderUrl } from "./catalog";

export type BlockedLink = "code" | "demo";

type Props = {
  project: Project;
  /** Called instead of navigating when the project has no real URL yet. */
  onBlocked: (kind: BlockedLink) => void;
  codeClassName: string;
  demoClassName: string;
  iconSize?: number;
  codeLabel: string;
  demoLabel: string;
};

/**
 * The Code / Play pair. Shared by the card and the modal so the
 * placeholder-URL interception can only be written once — the two used to
 * carry their own near-identical copies of it.
 */
export default function ProjectLinks({
  project,
  onBlocked,
  codeClassName,
  demoClassName,
  iconSize = 16,
  codeLabel,
  demoLabel,
}: Props) {
  const guard =
    (url: string, kind: BlockedLink) => (e: React.MouseEvent) => {
      // Always stop the click here: inside a card the parent opens the modal.
      e.stopPropagation();
      if (isPlaceholderUrl(url)) {
        e.preventDefault();
        onBlocked(kind);
      }
    };

  return (
    <>
      <Link
        href={project.githubUrl}
        onClick={guard(project.githubUrl, "code")}
        target={isPlaceholderUrl(project.githubUrl) ? undefined : "_blank"}
        className={codeClassName}
      >
        <GithubIcon size={iconSize} /> <span>{codeLabel}</span>
      </Link>
      <Link
        href={project.demoUrl}
        onClick={guard(project.demoUrl, "demo")}
        target={isPlaceholderUrl(project.demoUrl) ? undefined : "_blank"}
        className={demoClassName}
      >
        <ExternalLink size={iconSize} /> <span>{demoLabel}</span>
      </Link>
    </>
  );
}
