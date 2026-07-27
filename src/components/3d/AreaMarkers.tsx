"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SECTIONS, markerAnchor } from "./worldLayout";
import { useAppState } from "../AppStateContext";

/**
 * A pulsing dot floating over each area, marking the spots worth visiting.
 *
 * These live in the 3D scene rather than in the overlay on purpose: drawn as
 * sprites they sit in the depth buffer, so a building in front simply hides
 * the marker behind it. An HTML overlay would have to be told about occlusion,
 * and would get it wrong every time the camera moved. (The dotted line back to
 * the card is the opposite case — flat, always on top, and so belongs in DOM.)
 */

const IDLE_COLOR = new THREE.Color("#ffffff");
const FACING_COLOR = new THREE.Color("#f97316");

const IDLE_SCALE = 0.5;
const FACING_SCALE = 0.8;
const PULSE_DEPTH = 0.1; // fraction of the base size
const PULSE_SPEED = 2.2; // radians per second
const EASE = 0.12; // per-frame approach to the target size/colour

/** A soft white disc with a faint rim, tinted per marker via material colour. */
function makeDotTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;
  const centre = size / 2;
  ctx.beginPath();
  ctx.arc(centre, centre, size * 0.34, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = size * 0.06;
  ctx.strokeStyle = "rgba(60, 40, 20, 0.25)";
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function AreaMarkers() {
  const { facing } = useAppState();
  const texture = useMemo(() => makeDotTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  const sprites = useRef<(THREE.Sprite | null)[]>([]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    SECTIONS.forEach((section, i) => {
      const sprite = sprites.current[i];
      if (!sprite) return;

      // Offsetting the phase by index keeps the five dots from pulsing in
      // lockstep, which reads as a glitch rather than as life.
      const pulse = 1 + Math.sin(time * PULSE_SPEED + i) * PULSE_DEPTH;
      const size = (section === facing ? FACING_SCALE : IDLE_SCALE) * pulse;
      sprite.scale.setScalar(size);

      const material = sprite.material as THREE.SpriteMaterial;
      material.color.lerp(section === facing ? FACING_COLOR : IDLE_COLOR, EASE);
    });
  });

  return (
    <>
      {SECTIONS.map((section, i) => (
        <sprite
          key={section}
          ref={(el) => {
            sprites.current[i] = el;
          }}
          position={markerAnchor(section)}
        >
          {/* depthWrite off so the dots never occlude each other, depthTest on
              so the buildings still occlude them. */}
          <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </>
  );
}
