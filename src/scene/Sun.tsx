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
  dragSunDirection,
  sunVisibility,
} from "./sunLight";
import { markerScaleForScreenRadius } from "./worldLayout";
import type { Direction } from "./planet/planetLayout";

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

/** Scratch for reading the camera's own axes out of its matrix; never kept. */
const cameraRight = new THREE.Vector3();
const cameraUp = new THREE.Vector3();

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
  /** The pointer currently holding the sun, and where it was last seen. */
  const heldRef = useRef<{ id: number; x: number; y: number } | null>(null);

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
  /** Scratch for the sun's depth along the camera's forward axis; never kept. */
  const viewSpace = useRef(new THREE.Vector3());
  const viewDirection = useRef(new THREE.Vector3());

  /**
   * The drag itself lives on `window`, not on the sprite.
   *
   * The sun is a small target and the pointer leaves it almost immediately once
   * it starts moving; a `onPointerMove` on the sprite would only fire while the
   * pointer was still over it, so the sun would come unstuck the moment it was
   * actually dragged. Listening on `window` is also how `useViewInput` runs the
   * planet's own drag, so the two behave the same way at the edges of the
   * screen and when the button is released outside the window.
   */
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const held = heldRef.current;
      if (!held || held.id !== event.pointerId) return;
      event.preventDefault();

      // The camera's own axes, this frame. Read out of its matrix rather than
      // assumed: `camera.up` is a building's normal while a section is framed,
      // not the world's +Y.
      camera.updateMatrixWorld();
      cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
      cameraUp.setFromMatrixColumn(camera.matrixWorld, 1);

      // A pixel of travel, in radians. Derived rather than tuned: at the
      // sprite's own distance a pixel subtends `fov / viewportHeight`, so this
      // is what keeps the sun under the finger holding it at any window size or
      // field of view. A constant would track at exactly one window size.
      const height = Math.max(1, canvas.clientHeight);
      const radiansPerPixel = (((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180) / height;

      directionRef.current = dragSunDirection(
        directionRef.current,
        event.clientX - held.x,
        event.clientY - held.y,
        [cameraRight.x, cameraRight.y, cameraRight.z],
        [cameraUp.x, cameraUp.y, cameraUp.z],
        radiansPerPixel
      );
      held.x = event.clientX;
      held.y = event.clientY;
    };

    // Let go on release *anywhere* — a pointer that comes up outside the window
    // would otherwise leave the sun stuck to it and the free orbit locked out
    // behind it.
    const release = () => {
      if (!heldRef.current) return;
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
    // before matrixWorldInverse is read (the same trap `AreaMarkers` documents).
    const perspective = state.camera as THREE.PerspectiveCamera;
    perspective.updateMatrixWorld();
    const depth = -viewSpace.current.copy(sprite.position).applyMatrix4(perspective.matrixWorldInverse).z;
    if (depth > 0.01) {
      sprite.scale.setScalar(
        markerScaleForScreenRadius(SUN_ORB_SCREEN_RADIUS, depth, perspective.fov, state.size.height)
      );
    }

    // Fade the object out once it is between the eye and the world — at those
    // angles the sun is really behind the viewer, and the planet being fully
    // lit is the whole of what should be left. See `sunVisibility`. Hidden
    // outright at zero so it stops taking the pointer as well as light.
    const eye = viewDirection.current.copy(perspective.position).normalize();
    const showing = sunVisibility(directionRef.current, [eye.x, eye.y, eye.z]);
    (sprite.material as THREE.SpriteMaterial).opacity = showing;
    sprite.visible = showing > 0.01;
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
          heldRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
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
