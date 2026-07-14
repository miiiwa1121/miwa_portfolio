import { Project } from "../types";

export const umoja: { ja: Project; en: Project } = {
  ja: {
    id: 2,
    title: "Umoja (ぐるディス)",
    description: "「文字にはわからないことがある」グループディスカッション（GD）をオンラインで評価し、参加者が自分の意思で企業へ評価データを送れるプラットフォームです。",
    image: "/images/project_placeholder.png",
    tags: ["Next.js", "Supabase", "LiveKit", "Gemini", "Whisper"],
    category: "WEB",
    status: "dev",
    githubUrl: "#",
    demoUrl: "#"
  },
  en: {
    id: 2,
    title: "Umoja (GruDis)",
    description: "\"Some things can't be understood through text.\" A platform that evaluates online group discussions (GD) and allows participants to send evaluation data to companies at their own discretion.",
    image: "/images/project_placeholder.png",
    tags: ["Next.js", "Supabase", "LiveKit", "Gemini", "Whisper"],
    category: "WEB",
    status: "dev",
    githubUrl: "#",
    demoUrl: "#"
  }
};
