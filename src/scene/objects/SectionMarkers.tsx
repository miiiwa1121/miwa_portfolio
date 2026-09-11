"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import { markerScaleForScreenRadius } from "../camera/cameraLayout";
import {
  BOLT_PATH,
  MARKER_CLEARANCE,
  MARKER_FACING_INK,
  MARKER_GLOW_FILL,
  MARKER_GLYPH_FILL,
  MARKER_GLYPH_RIM,
  MARKER_IDLE_INK,
  boltFlicker,
  strikeIndex,
} from "../markerBolt";
import { PLANET_SECTION_KEYS, sectionDirection } from "../planet/sections";
import { markerOnScreen, publishMarkerScreen } from "../camera/markerScreen";
import { sceneClock } from "../sceneClock";
import { useAppState } from "@/state/AppStateContext";
import { facingNow } from "@/state/facingChannel";

/**
 * A pulsing bolt of pale blue lightning floating over each area, marking the
 * spots worth visiting.
 *
 * These live in the 3D scene rather than in the overlay on purpose: drawn as
 * sprites they sit in the depth buffer, so a building in front simply hides
 * the marker behind it. An HTML overlay would have to be told about occlusion,
 * and would get it wrong every time the camera moved. (The dotted line back to
 * the card is the opposite case — flat, always on top, and so belongs in DOM.)
 *
 * Their *size*, though, is screen-space: each bolt is a fixed number of CSS
 * pixels tall, and the world scale that produces it is recomputed each frame
 * from the sprite's own depth. The marker is one end of a flat annotation whose
 * other end (the trail) is drawn in DOM at a fixed stroke width and fixed
 * pixel-sized kinks — measuring the two in different units is what made the gap
 * between them impossible to keep still.
 */

const IDLE_COLOR = new THREE.Color(MARKER_IDLE_INK);
const FACING_COLOR = new THREE.Color(MARKER_FACING_INK);

/**
 * How far each bolt reaches from its centre on screen, in CSS pixels —
 * measured straight up and down, which is the direction the glyph fills. It is
 * about half as wide as it is tall.
 */
const IDLE_RADIUS = 9;
const FACING_RADIUS = 14;
/** Hovering swells the bolt so it reads as a target, not just a label. */
const HOVER_RADIUS = 18;

const PULSE_DEPTH = 0.1; // fraction of the base size
const PULSE_SPEED = 2.2; // radians per second
const EASE = 0.12; // per-frame approach to the target size/colour

/** Below this the bolt is not just invisible but should stop taking clicks. */
const MIN_VISIBLE_RADIUS = 0.5;

/**
 * The spotlight marker does not ease — it is already correct the moment the
 * trail starts pointing at it.
 *
 * The trail's far end moves to the new marker instantly, so easing the new
 * marker's colour and size in over ~0.4s left the line ending on a small pale
 * bolt while a large bright one still sat somewhere else. Turning quickly,
 * that reads as the line being connected to nothing. Markers being demoted
 * still ease, since nothing is anchored to them on the way out.
 */

/**
 * A white lightning bolt with a glow and a dark outline, tinted per marker via
 * material colour.
 *
 * Painted white so the tint is a plain multiply — the glow and the outline come
 * along for the ride, which is what keeps a spark (see `boltFlicker`) from
 * leaving a stale-coloured halo behind the flash.
 *
 * 256px rather than the 128 the old disc used: a circle degrades gracefully,
 * but the bolt's long diagonals alias badly, and the quad reaches past 100px
 * on screen at hover size.
 */
function makeBoltTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;
  const centre = size / 2;
  // The outline straddles the edge, so the outermost lit pixel of the *solid*
  // glyph lands exactly on MARKER_GLYPH_FILL — the fraction the trail measures
  // its clearance from. (The glow spills further; that is deliberate and the
  // trail does not count it.)
  const reach = size * (MARKER_GLYPH_FILL - MARKER_GLYPH_RIM / 2);

  ctx.beginPath();
  BOLT_PATH.forEach(([x, y], i) => {
    const px = centre + x * reach;
    const py = centre + y * reach;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();

  // Round joins, not the default miter. A miter on the bolt's sharpest corner
  // shoots a spike well past MARKER_GLYPH_FILL, which would put the glyph's
  // real extent somewhere other than the half-height the sprite was sized to —
  // and the trail's gap with it. The disc never had a corner to get this wrong.
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // The glow, painted as a blurred copy of the shape itself. A radial gradient
  // would have been simpler and wrong: it puts a round ball of light around a
  // shape that is anything but round.
  ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
  ctx.shadowBlur = size * (MARKER_GLOW_FILL - MARKER_GLYPH_FILL);
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 3; i++) ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.fill();
  ctx.lineWidth = size * MARKER_GLYPH_RIM;
  ctx.strokeStyle = "rgba(12, 46, 68, 0.35)";
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Scratch vectors; never read across frames. */
const projected = new THREE.Vector3();
const viewSpace = new THREE.Vector3();
const cornerScratch = new THREE.Vector3();
const normalScratch = new THREE.Vector3();

/**
 * How far a box reaches outward from its own centre, in direction `normal`.
 *
 * The successor to `box.max.y` — which was only ever "how far up" because the
 * old world's buildings had no reason to be anything but Y-up. On the sphere
 * a building's own foundation (see `FOUNDATION_DEPTH` in ProceduralObjects.tsx)
 * makes its bounding box reach much further inward, towards the planet's
 * centre, than outward towards the roof — a bounding *sphere* centred on the
 * box would be inflated by that buried depth and park the marker further from
 * the roof than the roof needs. Walking the box's 8 corners and keeping only
 * the outward side answers "how far out does the visible part reach" without
 * being fooled by the part nobody sees.
 */
function outwardExtent(box: THREE.Box3, centre: THREE.Vector3, normal: THREE.Vector3): number {
  let farthest = 0;
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) {
        cornerScratch.set(x, y, z).sub(centre);
        farthest = Math.max(farthest, cornerScratch.dot(normal));
      }
  return farthest;
}

export default function SectionMarkers() {
  const { activeSection, setActiveSection } = useAppState();
  const [hovered, setHovered] = useState<string | null>(null);
  useCursor(hovered !== null);
  const texture = useMemo(() => makeBoltTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const anchors = useRef<THREE.Vector3[]>([]);
  const placed = useRef(false);
  /** Eased half-height per marker, in px, so hiding and revealing are not a pop. */
  const radii = useRef<number[]>([]);
  /** The half-height each bolt was actually drawn at this frame, pulse included. */
  const drawn = useRef<number[]>([]);

  useFrame((state) => {
    // The area currently being talked about. Focusing one pins it; otherwise it
    // is whatever the camera has turned towards. The card reads the same thing,
    // which is what keeps the highlighted bolt, the trail and the card agreeing.
    //
    // Read here rather than as a subscription: the answer is only ever used to
    // draw this frame, so there is nothing for a re-render to do (see
    // `facingChannel`). The camera publishes it earlier in this same frame.
    const spotlight = activeSection ?? facingNow();

    // Only the pulse and the spark are on the diorama's clock. The easing below
    // and the projection at the end are answers to the camera and the pointer,
    // both of which still move while the scene is paused.
    const time = sceneClock.time(state.clock.elapsedTime);

    // Park each bolt just clear of its building's real bounds, once the voxel
    // meshes exist. Reading the scene beats hand-tuned heights: the buildings
    // are procedural and still changing shape, and a number typed in by hand
    // silently ends up buried inside a roof the moment one grows.
    if (!placed.current) {
      const box = new THREE.Box3();
      const centre = new THREE.Vector3();
      let complete = true;

      PLANET_SECTION_KEYS.forEach((section, i) => {
        const building = state.scene.getObjectByName(section);
        const sprite = sprites.current[i];
        if (!building || !sprite) {
          complete = false;
          return;
        }
        box.setFromObject(building);
        box.getCenter(centre);
        const [nx, ny, nz] = sectionDirection(section);
        normalScratch.set(nx, ny, nz);
        const reach = outwardExtent(box, centre, normalScratch) + MARKER_CLEARANCE;
        sprite.position.copy(centre).addScaledVector(normalScratch, reach);
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

    PLANET_SECTION_KEYS.forEach((section, i) => {
      const sprite = sprites.current[i];
      if (!sprite) return;

      // Offsetting the phase by index keeps the five bolts from pulsing in
      // lockstep, which reads as a glitch rather than as life.
      const pulse = 1 + Math.sin(time * PULSE_SPEED + i) * PULSE_DEPTH;
      const base =
        section === hovered
          ? HOVER_RADIUS
          : section === spotlight
            ? FACING_RADIUS
            : IDLE_RADIUS;

      // Focusing an area is the end of the markers' job — every bolt withdraws,
      // the focused one included. They are an invitation to go somewhere, and
      // once the camera has arrived there is nowhere left to invite anyone:
      // the others point at places just left behind, and the focused one hangs
      // over the building it has filled the frame with. The trail from the card
      // is hidden on the same beat, for the same reason.
      const target = activeSection ? 0 : base;
      // `target > 0` is what keeps the spotlight's exemption from easing to the
      // way *in*, which is the only direction it was ever for. Withdrawing is a
      // demotion like any other, and without this the focused area's own bolt
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

      // The world scale that makes this bolt reach `radius` px from its centre,
      // at this sprite's own depth. Depth along the camera's forward axis,
      // which is what the projection divides by — the straight-line distance is
      // a different number and would size the bolts at the edges of the frame
      // wrongly.
      viewSpace.copy(sprite.position).applyMatrix4(camera.matrixWorldInverse);
      const depth = -viewSpace.z;
      if (depth > 0.01) {
        sprite.scale.setScalar(
          markerScaleForScreenRadius(radius, depth, camera.fov, viewportHeight)
        );
      }

      const material = sprite.material as THREE.SpriteMaterial;
      const wanted = isSpotlight || section === hovered ? FACING_COLOR : IDLE_COLOR;
      // Only the area being talked about sparks. Five bolts flashing at once
      // would be weather, not a set of labels — and the ones the reader is not
      // being pointed at have no reason to ask for attention. Copy first, then
      // scale, so the flash is a function of the frame's time rather than
      // something that compounds across frames.
      if (isSpotlight) material.color.copy(wanted).multiplyScalar(boltFlicker(time));
      else material.color.lerp(wanted, EASE);
    });

    // Hand the facing marker's screen position to the DOM leader line.
    const index = PLANET_SECTION_KEYS.indexOf(spotlight);
    const anchor = anchors.current[index];
    if (!anchor) return;
    projected.copy(anchor).project(camera);
    const { width, height } = state.size;
    const screenX = (projected.x * 0.5 + 0.5) * width;
    const screenY = (-projected.y * 0.5 + 0.5) * height;

    publishMarkerScreen(
      screenX,
      screenY,
      // Exact, not estimated: this is the same half-height the sprite was just
      // sized to, so the trail can stop a fixed distance from its edge — after
      // asking `markerClearance()` how far the ink reaches in its own
      // direction, since the bolt is not a disc.
      drawn.current[index] ?? 0,
      // The trail draws a fresh bolt each time this turns over, which is the
      // same instant this marker flashes — both come off `FLICKER_PERIOD`. On
      // the scene clock, so the pause button stops the trail redrawing too.
      strikeIndex(time),
      // Two ways the marker can have nothing to point at: behind the camera,
      // or outside the viewport (real, but unseeable — a trail running off the
      // edge points at nothing). The rule itself lives in markerScreen.ts, as
      // a pure function with tests, because it is the sort that fails quietly.
      markerOnScreen(screenX, screenY, projected.z, width, height)
    );
  });

  return (
    <>
      {PLANET_SECTION_KEYS.map((section, i) => (
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
          {/* depthWrite off so the bolts never occlude each other, depthTest on
              so the buildings still occlude them. */}
          <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </>
  );
}
