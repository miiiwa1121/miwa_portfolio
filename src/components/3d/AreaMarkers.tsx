"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import {
  SECTIONS,
  MARKER_CLEARANCE,
  MARKER_DOT_FILL,
  MARKER_DOT_RIM,
  markerScaleForScreenRadius,
} from "./worldLayout";
import { publishMarkerScreen } from "./markerScreen";
import { sceneClock } from "./sceneClock";
import { useAppState } from "../AppStateContext";

/**
 * A pulsing dot floating over each area, marking the spots worth visiting.
 *
 * These live in the 3D scene rather than in the overlay on purpose: drawn as
 * sprites they sit in the depth buffer, so a building in front simply hides
 * the marker behind it. An HTML overlay would have to be told about occlusion,
 * and would get it wrong every time the camera moved. (The dotted line back to
 * the card is the opposite case — flat, always on top, and so belongs in DOM.)
 *
 * Their *size*, though, is screen-space: each dot is a fixed number of CSS
 * pixels across, and the world scale that produces it is recomputed each frame
 * from the sprite's own depth. The dot is one end of a flat annotation whose
 * other end (the trail) is drawn in DOM at a fixed stroke width and a fixed
 * zigzag step — measuring the two in different units is what made the gap
 * between them impossible to keep still.
 */

const IDLE_COLOR = new THREE.Color("#ffffff");
const FACING_COLOR = new THREE.Color("#f97316");

/** Dot radii on screen, in CSS pixels. */
const IDLE_RADIUS = 9;
const FACING_RADIUS = 14;
/** Hovering swells the dot so it reads as a target, not just a label. */
const HOVER_RADIUS = 18;

const PULSE_DEPTH = 0.1; // fraction of the base size
const PULSE_SPEED = 2.2; // radians per second
const EASE = 0.12; // per-frame approach to the target size/colour

/** Below this the dot is not just invisible but should stop taking clicks. */
const MIN_VISIBLE_RADIUS = 0.5;

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
  // The rim straddles the arc, so the outermost lit pixel lands exactly on
  // MARKER_DOT_FILL — the fraction the trail measures its clearance from.
  ctx.beginPath();
  ctx.arc(centre, centre, size * (MARKER_DOT_FILL - MARKER_DOT_RIM / 2), 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = size * MARKER_DOT_RIM;
  ctx.strokeStyle = "rgba(60, 40, 20, 0.25)";
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Scratch vectors; never read across frames. */
const projected = new THREE.Vector3();
const viewSpace = new THREE.Vector3();

export default function AreaMarkers() {
  const { facing, activeSection, setActiveSection } = useAppState();
  const [hovered, setHovered] = useState<string | null>(null);
  useCursor(hovered !== null);
  const texture = useMemo(() => makeDotTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const anchors = useRef<THREE.Vector3[]>([]);
  const placed = useRef(false);
  /** Eased radius per marker, in px, so hiding and revealing are not a pop. */
  const radii = useRef<number[]>([]);
  /** The radius each dot was actually drawn at this frame, pulse included. */
  const drawn = useRef<number[]>([]);

  // The area currently being talked about. Focusing one pins it; otherwise it
  // is whatever the camera has turned towards. The card reads the same thing,
  // which is what keeps the highlighted dot, the trail and the card agreeing.
  const spotlight = activeSection ?? facing;

  useFrame((state) => {
    // Only the pulse is on the diorama's clock. The easing below and the
    // projection at the end are answers to the camera and the pointer, both of
    // which still move while the scene is paused.
    const time = sceneClock.time(state.clock.elapsedTime);

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

    const camera = state.camera as THREE.PerspectiveCamera;
    const viewportHeight = state.size.height;

    // Bring the camera's matrices up to date with the position it was just
    // moved to, before anything below reads them.
    //
    // This is the whole reason the trail's far end used to lag the dot by a
    // frame. `camera-controls`' update() writes `position` and `quaternion`
    // every frame but only calls updateMatrixWorld() in its focal-offset
    // branch, which this scene never takes — so at this point matrixWorld and
    // matrixWorldInverse are still the *previous* frame's. project() reads
    // matrixWorldInverse, so the trail was aimed at where the marker had been,
    // while gl.render() refreshed the matrices a moment later and drew the dot
    // where it now is. Static things never showed it; the gap at the moving
    // end opened turning one way and closed turning the other.
    camera.updateMatrixWorld();

    SECTIONS.forEach((section, i) => {
      const sprite = sprites.current[i];
      if (!sprite) return;

      // Offsetting the phase by index keeps the five dots from pulsing in
      // lockstep, which reads as a glitch rather than as life.
      const pulse = 1 + Math.sin(time * PULSE_SPEED + i) * PULSE_DEPTH;
      const base =
        section === hovered
          ? HOVER_RADIUS
          : section === spotlight
            ? FACING_RADIUS
            : IDLE_RADIUS;

      // Focusing an area is the end of the markers' job — every dot withdraws,
      // the focused one included. They are an invitation to go somewhere, and
      // once the camera has arrived there is nowhere left to invite anyone:
      // the others point at places just left behind, and the focused one hangs
      // over the building it has filled the frame with. The trail from the card
      // is hidden on the same beat, for the same reason.
      const target = activeSection ? 0 : base;
      // `target > 0` is what keeps the spotlight's exemption from easing to the
      // way *in*, which is the only direction it was ever for. Withdrawing is a
      // demotion like any other, and without this the focused area's own dot
      // would blink out rather than fade.
      const isSpotlight = section === spotlight;
      const eased =
        isSpotlight && target > 0
          ? target
          : THREE.MathUtils.lerp(radii.current[i] ?? target, target, EASE);
      radii.current[i] = eased;

      const radius = eased * pulse;
      drawn.current[i] = radius;

      // Below a hair's width it is not just invisible but should stop taking
      // hover and clicks, which an unseen sprite would otherwise still accept.
      sprite.visible = radius > MIN_VISIBLE_RADIUS;

      // The world scale that lands this dot on `radius` px, at this sprite's
      // own depth. Depth along the camera's forward axis, which is what the
      // projection divides by — the straight-line distance is a different
      // number and would size the dots at the edges of the frame wrongly.
      viewSpace.copy(sprite.position).applyMatrix4(camera.matrixWorldInverse);
      const depth = -viewSpace.z;
      if (depth > 0.01) {
        sprite.scale.setScalar(
          markerScaleForScreenRadius(radius, depth, camera.fov, viewportHeight)
        );
      }

      const material = sprite.material as THREE.SpriteMaterial;
      const wanted = isSpotlight || section === hovered ? FACING_COLOR : IDLE_COLOR;
      if (isSpotlight) material.color.copy(wanted);
      else material.color.lerp(wanted, EASE);
    });

    // Hand the facing marker's screen position to the DOM leader line.
    const index = SECTIONS.indexOf(spotlight);
    const anchor = anchors.current[index];
    if (!anchor) return;
    projected.copy(anchor).project(camera);
    const { width, height } = state.size;
    const screenX = (projected.x * 0.5 + 0.5) * width;
    const screenY = (-projected.y * 0.5 + 0.5) * height;

    publishMarkerScreen(
      screenX,
      screenY,
      // Exact, not estimated: this is the same number the dot was just sized
      // to, so the trail can stop a fixed distance from its edge.
      drawn.current[index] ?? 0,
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
