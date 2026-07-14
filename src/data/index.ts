import { gashaan } from "./projects/gashaan";
import { umoja } from "./projects/umoja";
import { imadoko } from "./projects/imadoko";
import { mesen } from "./projects/mesen";
import { reallog } from "./projects/reallog";
import { thanksLog } from "./projects/thanksLog";
import { soundCardGame } from "./projects/soundCardGame";
import { vegetableCardGame } from "./projects/vegetableCardGame";
import { Project } from "./types";

export const projectsJP: Project[] = [
  gashaan.ja,
  umoja.ja,
  imadoko.ja,
  mesen.ja,
  reallog.ja,
  thanksLog.ja,
  soundCardGame.ja,
  vegetableCardGame.ja
];

export const projectsEN: Project[] = [
  gashaan.en,
  umoja.en,
  imadoko.en,
  mesen.en,
  reallog.en,
  thanksLog.en,
  soundCardGame.en,
  vegetableCardGame.en
];

export type { Project };
