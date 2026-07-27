// Shared pastel palette for the whole voxel city.
// Keeping colors in one place keeps the world cohesive.

import { hash01 } from "./rng";

export const PALETTE = {
  // Terrain
  grass: ["#8fd94b", "#a3e05a", "#7ecb3b", "#b6e77a"],
  dirt: ["#cf9b63", "#c08a4f", "#b97f45"],
  stone: ["#a7ab9a", "#9aa08c", "#b3b7a6"],
  sand: ["#f2dca0", "#ecd08a"],

  // Roads / plaza
  road: "#f6cfe1",
  roadEdge: "#fbe3ef",
  plaza: "#fbe3d0",
  water: "#8fd6f2",

  // Buildings
  pink: ["#f7a8c4", "#f48fb1", "#fbc0d6"],
  pinkDark: "#e87ba3",
  blue: ["#7fc9f2", "#6bb8e8", "#a6dbf7"],
  cream: ["#fde6c4", "#f8dcac"],
  green: ["#8fd94b", "#7ecb3b"],
  white: "#fbf7ef",
  roofRed: "#ef7b7b",
  roofBlue: "#6fb3e0",
  glass: "#bfe9f7",
  glassWarm: "#ffe9a8",
  wood: "#c98a56",

  // Accents
  yellow: ["#ffd34d", "#ffc61a"],
  orange: "#ff8a3d",
  sky: "#fff3d1",
} as const;

// Pick a deterministic color from a list using a seed so neighboring
// voxels get subtle variation instead of a flat fill.
export function pick(list: readonly string[], seed: number): string {
  return list[Math.floor(hash01(seed) * list.length) % list.length];
}
