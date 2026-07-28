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

/**
 * The spotlight dot does not ease — it is already correct the moment the trail
 * starts pointing at it.
 *
 * The trail's far end moves to the new marker instantly, so easing the new
 * marker's colour and size in over ~0.4s left the line ending on a small pale
 * dot while a large accented one still sat somewhere else. Turning quickly,
 * that reads as the line being connected to nothing. Dots being demoted still
 * ease, since nothing is anchored to them on the way out.
 */

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

/** Scratch vectors for the projection; never read across frames. */
const projected = new THREE.Vector3();
const projectedEdge = new THREE.Vector3();

export default function AreaMarkers() {
  const { facing, activeSection, setActiveSection } = useAppState();
  const [hovered, setHovered] = useState<string | null>(null);
  useCursor(hovered !== null);
  const texture = useMemo(() => makeDotTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const anchors = useRef<THREE.Vector3[]>([]);
  const placed = useRef(false);
  /** Eased size per marker, so hiding and revealing are not a pop. */
  const scales = useRef<number[]>([]);

  // The area currently being talked about. Focusing one pins it; otherwise it
  // is whatever the camera has turned towards. The card reads the same thing,
  // which is what keeps the highlighted dot, the trail and the card agreeing.
  const spotlight = activeSection ?? facing;

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
          : section === spotlight
            ? FACING_SCALE
            : IDLE_SCALE;

      // Once an area is focused it is the only one being talked about, so the
      // other markers withdraw rather than sit there offering to navigate
      // somewhere the camera has just left.
      const target = activeSection && section !== activeSection ? 0 : base;
      const isSpotlight = section === spotlight;
      const eased = isSpotlight
        ? target
        : THREE.MathUtils.lerp(scales.current[i] ?? target, target, EASE);
      scales.current[i] = eased;

      // Below a hair's width it is not just invisible but should stop taking
      // hover and clicks, which an unseen sprite would otherwise still accept.
      sprite.visible = eased > 0.02;
      sprite.scale.setScalar(eased * pulse);

      const material = sprite.material as THREE.SpriteMaterial;
      const wanted = isSpotlight || section === hovered ? FACING_COLOR : IDLE_COLOR;
      if (isSpotlight) material.color.copy(wanted);
      else material.color.lerp(wanted, EASE);
    });

    // Hand the facing marker's screen position to the DOM leader line.
    const anchor = anchors.current[SECTIONS.indexOf(spotlight)];
    if (!anchor) return;
    projected.copy(anchor).project(state.camera);
    const { width, height } = state.size;
    const screenX = (projected.x * 0.5 + 0.5) * width;
    const screenY = (-projected.y * 0.5 + 0.5) * height;

    // Project the dot's top edge too. A sprite's world size stays constant
    // while its screen size does not, so the trail can only know how much room
    // to leave by measuring it here, where the camera is.
    const spotlightSprite = sprites.current[SECTIONS.indexOf(spotlight)];
    const worldRadius = (spotlightSprite?.scale.y ?? IDLE_SCALE) / 2;
    projectedEdge
      .copy(anchor)
      .addScaledVector(state.camera.up, worldRadius)
      .project(state.camera);
    const screenRadius = Math.abs((-projectedEdge.y * 0.5 + 0.5) * height - screenY);

    publishMarkerScreen(
      Math.round(screenX),
      Math.round(screenY),
      Math.round(screenRadius),
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
