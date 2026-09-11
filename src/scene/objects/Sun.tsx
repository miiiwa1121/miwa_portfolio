"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import {
  SCENE_BOUNDING_RADIUS,
  SUN_DIRECTION,
  SUN_DISTANCE,
  SUN_SHADOW_FAR,
  SUN_SHADOW_NEAR,
  SUN_ORB_RADIUS,
  SUN_ORB_SCREEN_RADIUS,
  sunDirectionAlong,
} from "../sunLight";
import { markerScaleForScreenRadius } from "../camera/cameraLayout";
import type { Direction } from "../planet/geometry";
import { useAppState } from "@/state/AppStateContext";

/**
 * The sun: a light, an object in the sky, and a thing you can pick up and move.
 *
 * **Why it moves at all.** No fixed direction lights every area — the five span
 * 149.5° of sphere, and a search over all of them found the best possible
 * worst-lit area is exactly 0 (see `sunLight.ts`). Carrying the sun with the
 * camera fixes that automatically and was tried, but a light near the view axis
 * hides each building's shadow behind the building and stops the shading
 * changing as the planet turns, which reads flat. Handing it to the reader
 * keeps the shading alive — the sun stays put while the world turns under it —
 * and makes the dark side something you can do something about.
 *
 * **The light and the object are at different radii on the same ray.** A
 * directional light is only a direction; its position matters solely because
 * the shadow camera sits there, which pins the light to `SUN_DISTANCE` (every
 * shadow bound is derived from it). The visible sun sits much closer in, at
 * `SUN_ORB_RADIUS` — see the note there for why a distant one was never once on
 * screen — and is sized in pixels rather than world units, so it stays a
 * predictable thing to grab all the way round.
 *
 * **Only the overview altitude shows it, and only there can it be moved.** That
 * is where there is sky to see it in — the planet's disc is 9.7° across from
 * `ORBIT_RADIUS` against 19.7° from `NEAR_ORBIT_RADIUS`, and the near altitude
 * also leans the planet into the corner of the frame, which left the sun
 * clipped at the edge and on screen for about a third of a lap. The light does
 * not stop when the object goes: wherever the sun was left is where it goes on
 * shining from, at every altitude and inside every section.
 *
 * Everything here is written straight into three.js objects from a frame loop.
 * The direction lives in a ref rather than React state for the usual reason
 * (see `facingChannel`): a value that changes while a pointer is down must not
 * re-render anything, least of all the `<Canvas>`.
 */

/** A warm disc that falls off into a soft corona. */
function makeSunTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const centre = size / 2;

  // Two stops close together make the disc's own edge, and the rest is corona.
  // One smooth ramp from centre to nothing reads as a blur rather than as a
  // body with light around it.
  const gradient = ctx.createRadialGradient(centre, centre, 0, centre, centre, centre);
  gradient.addColorStop(0, "rgba(255, 253, 240, 1)");
  gradient.addColorStop(0.28, "rgba(255, 241, 196, 1)");
  gradient.addColorStop(0.34, "rgba(255, 214, 130, 0.72)");
  gradient.addColorStop(0.62, "rgba(255, 176, 84, 0.20)");
  gradient.addColorStop(1, "rgba(255, 150, 60, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Scratch for turning a pointer into a ray; never kept. */
const pointerNdc = new THREE.Vector2();
const pointerRay = new THREE.Raycaster();

type Props = {
  /**
   * Raised while the sun is being dragged, so the free orbit's own drag stands
   * down. Both gestures are the same pointer press; this one claims it because
   * R3F's pointer events fire on the canvas, which is inside the `window` the
   * orbit listens on, so the flag is already set by the time the orbit's own
   * handler runs.
   */
  draggingRef: React.RefObject<boolean>;
};

export default function Sun({ draggingRef }: Props) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const spriteRef = useRef<THREE.Sprite>(null);
  const directionRef = useRef<Direction>(SUN_DIRECTION);
  /** The id of the pointer currently holding the sun. */
  const heldRef = useRef<number | null>(null);

  // The one thing here that is React state rather than a ref: it changes on
  // enter, leave, press and release — a handful of times, never per frame — and
  // the cursor is a DOM concern that wants a render to hang off. Re-rendering
  // `Sun` is cheap and does not reach the `<Canvas>` above it.
  const [grip, setGrip] = useState<"none" | "over" | "held">("none");
  useCursor(grip !== "none", grip === "held" ? "grabbing" : "grab");

  const texture = useMemo(() => makeSunTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const { orbitZoom, activeSection } = useAppState();
  /**
   * Whether the sun is on show and in reach. `activeSection` as well as the
   * altitude: clicking a marker focuses an area without touching `orbitZoom`,
   * so "far" and "a building fills the frame" can be true at once.
   */
  const reachable = orbitZoom === "far" && !activeSection;
  /** Scratch for the sun's depth along the camera's forward axis; never kept. */
  const viewSpace = useRef(new THREE.Vector3());

  /**
   * The drag itself lives on `window`, not on the sprite.
   *
   * The sun is a small target and the pointer leaves it for a moment on every
   * fast drag; a `onPointerMove` on the sprite would only fire while the
   * pointer was still over it, so the sun would come unstuck exactly when it
   * was being moved quickly. Listening on `window` is also how `useViewInput` runs the
   * planet's own drag, so the two behave the same way at the edges of the
   * screen and when the button is released outside the window.
   */
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (heldRef.current !== event.pointerId) return;
      event.preventDefault();

      // Straight to where the pointer is, rather than turned by how far it
      // moved — see `sunDirectionAlong` for why no scaling of a delta can
      // track. The camera's matrices have to be current before a ray is built
      // from them: `camera-controls` writes position and quaternion each frame
      // and leaves the matrices to `gl.render()`, so an event arriving between
      // the two would otherwise aim with the previous frame's camera.
      const rect = canvas.getBoundingClientRect();
      pointerNdc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      camera.updateMatrixWorld();
      pointerRay.setFromCamera(pointerNdc, camera);
      const { origin, direction } = pointerRay.ray;
      directionRef.current = sunDirectionAlong(
        [origin.x, origin.y, origin.z],
        [direction.x, direction.y, direction.z]
      );
    };

    // Let go on release *anywhere* — a pointer that comes up outside the window
    // would otherwise leave the sun stuck to it and the free orbit locked out
    // behind it.
    const release = () => {
      if (heldRef.current === null) return;
      heldRef.current = null;
      draggingRef.current = false;
      setGrip((current) => (current === "held" ? "none" : current));
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [camera, canvas, draggingRef]);

  // Leaving the overview mid-drag — the zoom control is a DOM button and does
  // not go through the pointer the sun is holding — would otherwise leave the
  // sun stuck to it and the free orbit locked out behind it.
  useEffect(() => {
    if (reachable || heldRef.current === null) return;
    heldRef.current = null;
    draggingRef.current = false;
    setGrip("none");
  }, [reachable, draggingRef]);

  useFrame((state) => {
    const light = lightRef.current;
    const sprite = spriteRef.current;
    if (!light || !sprite) return;
    const [x, y, z] = directionRef.current;
    light.position.set(x * SUN_DISTANCE, y * SUN_DISTANCE, z * SUN_DISTANCE);
    sprite.position.set(x * SUN_ORB_RADIUS, y * SUN_ORB_RADIUS, z * SUN_ORB_RADIUS);

    // Hold the sun at a fixed size on screen. Depth along the camera's forward
    // axis, which is what the projection divides by — the straight-line
    // distance is a different number and would size it wrongly towards the
    // edges of the frame. `camera-controls` writes position and quaternion but
    // does not restate the matrices, so they have to be brought up to date
    // before matrixWorldInverse is read (the same trap `SectionMarkers` documents).
    const perspective = state.camera as THREE.PerspectiveCamera;
    perspective.updateMatrixWorld();
    const depth = -viewSpace.current.copy(sprite.position).applyMatrix4(perspective.matrixWorldInverse).z;
    if (depth > 0.01) {
      sprite.scale.setScalar(
        markerScaleForScreenRadius(SUN_ORB_SCREEN_RADIUS, depth, perspective.fov, state.size.height)
      );
    }

  });

  return (
    <>
      <directionalLight
        ref={lightRef}
        intensity={1.5}
        color="#fff3d6"
        castShadow
        // Halved from 2048. The shadows here are large soft shapes cast by
        // blocky geometry, where the extra resolution bought detail nobody
        // could see for four times the shadow-pass cost.
        shadow-mapSize={[1024, 1024]}
        // All four the same, and direction-independent: an orthographic shadow
        // camera's bounds hold the projected size of what it frames, so they
        // only have to cover the scene's own bounding radius. These and their
        // relationship to SUN_DISTANCE live in sunLight.ts, with a test — a
        // frustum that stops containing the world stops drawing those shadows,
        // and says nothing about it.
        shadow-camera-left={-SCENE_BOUNDING_RADIUS}
        shadow-camera-right={SCENE_BOUNDING_RADIUS}
        shadow-camera-top={SCENE_BOUNDING_RADIUS}
        shadow-camera-bottom={-SCENE_BOUNDING_RADIUS}
        shadow-camera-near={SUN_SHADOW_NEAR}
        shadow-camera-far={SUN_SHADOW_FAR}
        shadow-bias={-0.0005}
      />

      <sprite
        ref={spriteRef}
        // Not rendered and not raycast anywhere but the overview, which is what
        // makes "only there can it be moved" one rule rather than two.
        visible={reachable}
        onPointerOver={(e) => {
          e.stopPropagation();
          setGrip((current) => (current === "held" ? current : "over"));
        }}
        onPointerOut={() => {
          setGrip((current) => (current === "held" ? current : "none"));
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          draggingRef.current = true;
          heldRef.current = e.pointerId;
          setGrip("held");
        }}
      >
        {/* `depthWrite` off but depth *test* on: the planet has to be able to
            hide the sun when it passes behind, which is what makes this a body
            in the sky rather than an overlay stuck to the frame. */}
        <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </sprite>
    </>
  );
}
