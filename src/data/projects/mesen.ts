import { Project } from "../types";

export const mesen: { ja: Project; en: Project } = {
  ja: {
    id: 4,
    title: "mesen",
    description: "視線推定・顔認識を行い、結果をGIFやMP4で出力できるWebアプリケーションです。MediaPipeを用いてブラウザ上で動作します。",
    image: "/images/project_placeholder.png",
    tags: ["Next.js", "MediaPipe", "Tailwind CSS"],
    category: "WEB",
    status: "Public",
    githubUrl: "#",
    demoUrl: "https://mesen.miiiwa.workers.dev/"
  },
  en: {
    id: 4,
    title: "mesen",
    description: "A web application that performs gaze estimation and face recognition, and can output the results as GIF or MP4. It runs on the browser using MediaPipe.",
    image: "/images/project_placeholder.png",
    tags: ["Next.js", "MediaPipe", "Tailwind CSS"],
    category: "WEB",
    status: "Public",
    githubUrl: "#",
    demoUrl: "https://mesen.miiiwa.workers.dev/"
  }
};
