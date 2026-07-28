"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import { SECTIONS, MARKER_CLEARANCE } from "./worldLayout";
import { publishMarkerScreen } from "./markerScreen";
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
/** Hovering swells the dot so it reads as a target, not just a label. */
const HOVER_SCALE = 1.05;
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

/** Scratch vector for the projection; never read across frames. */
const projected = new THREE.Vector3();

export default function AreaMarkers() {
  const { facing, setActiveSection } = useAppState();
  const [hovered, setHovered] = useState<string | null>(null);
  useCursor(hovered !== null);
  const texture = useMemo(() => makeDotTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const anchors = useRef<THREE.Vector3[]>([]);
  const placed = useRef(false);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Park each dot just clear of its building's real bounds, once the voxel
    // meshes exist. Reading the scene beats hand-tuned heights: the buildings
    // are procedural and still changing shape, and a number typed in by hand
    // silently ends up buried inside a roof the moment one grows.
    if (!placed.current) {
      const box = new THREE.Box3();
      const centre = new THREE.Vector3();
      let complete = true;

      SECTIONS.forEach((section, i) => {
        const building = state.scene.getObjectByName(section);
        const sprite = sprites.current[i];
        if (!building || !sprite) {
          complete = false;
          return;
        }
        box.setFromObject(building);
        box.getCenter(centre);
        sprite.position.set(centre.x, box.max.y + MARKER_CLEARANCE, centre.z);
        anchors.current[i] = sprite.position.clone();
      });
      placed.current = complete;
    }

    SECTIONS.forEach((section, i) => {
      const sprite = sprites.current[i];
      if (!sprite) return;

      // Offsetting the phase by index keeps the five dots from pulsing in
      // lockstep, which reads as a glitch rather than as life.
      const pulse = 1 + Math.sin(time * PULSE_SPEED + i) * PULSE_DEPTH;
      const base =
        section === hovered
          ? HOVER_SCALE
          : section === facing
            ? FACING_SCALE
            : IDLE_SCALE;
      const size = base * pulse;
      sprite.scale.setScalar(size);

      const material = sprite.material as THREE.SpriteMaterial;
      material.color.lerp(
        section === facing || section === hovered ? FACING_COLOR : IDLE_COLOR,
        EASE
      );
    });

    // Hand the facing marker's screen position to the DOM leader line.
    const anchor = anchors.current[SECTIONS.indexOf(facing)];
    if (!anchor) return;
    projected.copy(anchor).project(state.camera);
    const { width, height } = state.size;
    const screenX = (projected.x * 0.5 + 0.5) * width;
    const screenY = (-projected.y * 0.5 + 0.5) * height;

    publishMarkerScreen(
      Math.round(screenX),
      Math.round(screenY),
      // Two ways the marker can have nothing to point at. z >= 1 puts it
      // behind the camera, where the projection flips and would fling the
      // trail off in the opposite direction. Outside the viewport it is real
      // but unseeable, and a trail running off the edge points at nothing.
      projected.z < 1 &&
        screenX >= 0 &&
        screenX <= width &&
        screenY >= 0 &&
        screenY <= height
    );
  });

  return (
    <>
      {SECTIONS.map((section, i) => (
        <sprite
          key={section}
          ref={(el) => {
            sprites.current[i] = el;
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(section);
          }}
          onPointerOut={() => setHovered(null)}
          onClick={(e) => {
            // Same destination as clicking the building itself: the camera
            // flies in and frames the area.
            e.stopPropagation();
            setActiveSection(section);
          }}
        >
          {/* depthWrite off so the dots never occlude each other, depthTest on
              so the buildings still occlude them. */}
          <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </>
  );
}
