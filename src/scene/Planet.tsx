"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { planetRelief, RELIEF_AMPLITUDE, SEA_LEVEL } from "./planet/shell";
import { SMOOTH_PLANET_RADIUS } from "./planet/sections";
import { PALETTE } from "./voxel/palette";

/**
 * The world's ground: currently a plain smooth sphere, not the voxel shell
 * stage 2 of docs/planet-migration.md shipped.
 *
 * **This is a live experiment, requested to compare against the voxel
 * ground** — a normal round planet at half the voxel version's diameter, to
 * see whether the site's character survives without the ground itself being
 * blocky (the buildings stay voxel either way). `scene/planet/shell.ts`'s
 * `planetVoxels()` and the rest of its terrain machinery are untouched and
 * still fully tested; reverting is pointing this component back at them and
 * `sectionGroundRadius` in `scene/planet/sections.ts` back at
 * `groundRadiusVoxels` (see that function's docstring).
 *
 * The colour still comes from `planetRelief` — continents and ocean are the
 * same shape as the voxel ground's, just painted onto a texture instead of
 * carved into blocks, rather than thrown away for a flat colour.
 */

/**
 * Texture resolution. Modest on purpose: this is a wash of a few flat colour
 * bands (water/sand/grass), not a hand-painted map, so nothing above a few
 * hundred pixels buys any more detail — it would just be a bigger blur at
 * the coastlines.
 */
const TEXTURE_WIDTH = 512;
const TEXTURE_HEIGHT = 256;

/** Flat colour per band — no per-pixel dithering, unlike the voxel ground's `pick()`. */
function bandColor(dir: readonly [number, number, number]): THREE.ColorRepresentation {
  const ground = planetRelief(dir) * RELIEF_AMPLITUDE;
  if (ground < SEA_LEVEL) return PALETTE.water;
  if (ground < 0.25) return PALETTE.sand[0];
  return PALETTE.grass[0];
}

/**
 * An equirectangular texture matching `SphereGeometry`'s own UV mapping, so
 * the continents this paints land under the same directions
 * `scene/planet/sections.ts` places buildings at.
 *
 * The pixel-to-direction formula here is copied from three.js's own
 * `SphereGeometry` vertex generation (`x = -cos(phi)·sin(theta)`,
 * `y = cos(theta)`, `z = sin(phi)·sin(theta)`) rather than reconciled with
 * this codebase's own `latLonToDirection` convention. `planetRelief` takes a
 * raw direction vector and has no opinion about which lat/lon convention
 * produced it, so matching three.js's own formula exactly is what keeps the
 * texture and the mesh it is painted for in agreement — a mismatched
 * convention here would rotate the continents relative to the sphere without
 * any error to catch it.
 */
function makePlanetTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(TEXTURE_WIDTH, TEXTURE_HEIGHT);
  const rgb = new THREE.Color();

  for (let py = 0; py < TEXTURE_HEIGHT; py++) {
    const v = (py + 0.5) / TEXTURE_HEIGHT;
    const theta = v * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    for (let px = 0; px < TEXTURE_WIDTH; px++) {
      const u = (px + 0.5) / TEXTURE_WIDTH;
      const phi = u * Math.PI * 2;
      const x = -Math.cos(phi) * sinTheta;
      const y = cosTheta;
      const z = Math.sin(phi) * sinTheta;

      rgb.set(bandColor([x, y, z]));
      const i = (py * TEXTURE_WIDTH + px) * 4;
      image.data[i] = Math.round(rgb.r * 255);
      image.data[i + 1] = Math.round(rgb.g * 255);
      image.data[i + 2] = Math.round(rgb.b * 255);
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function Planet() {
  const texture = useMemo(() => makePlanetTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[SMOOTH_PLANET_RADIUS, 64, 32]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}
