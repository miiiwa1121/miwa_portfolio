import { Project } from "../types";

export const soundCardGame: { ja: Project; en: Project } = {
  ja: {
    id: 7,
    title: "音階神経衰弱",
    description: "音を頼りに同じ音階のカードペアを探す神経衰弱（メモリー）ゲームです。カードをめくると音階が鳴ります。",
    image: "/images/project_placeholder.png",
    tags: ["Next.js", "React", "Web Audio API"],
    category: "WEB",
    status: "Public",
    githubUrl: "https://github.com/miiiwa1121/sound_card_game",
    demoUrl: "https://sound-card-game.miiiwa.workers.dev/"
  },
  en: {
    id: 7,
    title: "Sound Memory Game",
    description: "A memory game where you rely on sound to find matching card pairs of the same musical scale. When you flip a card, a musical scale is played.",
    image: "/images/project_placeholder.png",
    tags: ["Next.js", "React", "Web Audio API"],
    category: "WEB",
    status: "Public",
    githubUrl: "https://github.com/miiiwa1121/sound_card_game",
    demoUrl: "https://sound-card-game.miiiwa.workers.dev/"
  }
};
