import { Project } from "../types";

export const imadoko: { ja: Project; en: Project } = {
  ja: {
    id: 3,
    title: "imadoko",
    description: "URLを共有するだけで現在地をリアルタイムに共有できるWebアプリです。アプリインストールやアカウント登録は不要で、すぐに使い始められます。",
    image: "/images/imadoko.png",
    tags: ["Next.js", "Supabase", "Tailwind CSS", "Leaflet"],
    category: "WEB",
    status: "Public",
    githubUrl: "#",
    demoUrl: "https://imadoko.link"
  },
  en: {
    id: 3,
    title: "imadoko",
    description: "A web app that allows you to share your current location in real-time just by sharing a URL. No app installation or account registration is required, and you can start using it immediately.",
    image: "/images/imadoko.png",
    tags: ["Next.js", "Supabase", "Tailwind CSS", "Leaflet"],
    category: "WEB",
    status: "Public",
    githubUrl: "#",
    demoUrl: "https://imadoko.link"
  }
};
