/**
 * Where the facing area's marker currently sits on screen, in CSS pixels.
 *
 * The scene knows this (it has the camera); the leader line needs it (it is
 * DOM). Routing it through React state would re-render the whole overlay every
 * frame, on the same main thread that is already drawing several thousand
 * instanced voxels — so this is a plain subscription the scene pushes to and
 * the line writes straight to the DOM from.
 */

export type MarkerScreenPoint = {
  x: number;
  y: number;
  /**
   * The radius of the dot's drawn disc, in CSS pixels — the size the scene
   * just sized the sprite to, not a projection of it measured afterwards. The
   * trail stops a fixed clearance out from this, so any error here shows up
   * directly as the gap opening and closing as the camera moves.
   */
  radius: number;
  /** False when the marker is behind the camera or off-screen. */
  visible: boolean;
};

/**
 * Whether a projected marker is somewhere the trail can usefully point at.
 *
 * Pulled out of `AreaMarkers`' frame loop and given a name so it can be
 * tested, because **this is a rule that fails silently**: when it says no, the
 * trail simply hides, which looks exactly like a scene that has no trail. It
 * spent a release answering no on every frame of the default view — the
 * camera's downward lean (`NEAR_VERTICAL_SHARE`) had pushed the facing area
 * below the bottom of the frame, 16 of 20 sampled points around a full lap —
 * and nothing anywhere went red, because nothing had ever asked whether it
 * said yes.
 *
 * `depth` is the projected z: at or past 1 the marker is behind the camera,
 * where the projection flips sign and would fling the trail off in the
 * opposite direction.
 */
export function markerOnScreen(
  x: number,
  y: number,
  depth: number,
  width: number,
  height: number
): boolean {
  return depth < 1 && x >= 0 && x <= width && y >= 0 && y <= height;
}

const current: MarkerScreenPoint = { x: 0, y: 0, radius: 0, visible: false };
const listeners = new Set<(point: MarkerScreenPoint) => void>();

/**
 * Called by the scene each frame. Cheap no-op when nothing moved.
 *
 * Values are passed through unrounded. Rounding them to whole pixels used to
 * save the odd redraw, but it also jittered the far end of the trail by up to
 * half a pixel every frame — and it saved nothing in practice, since the
 * camera's idle drift changes the projection continuously anyway. When the
 * diorama is genuinely stopped the numbers repeat exactly and this returns
 * early as before.
 */
export function publishMarkerScreen(
  x: number,
  y: number,
  radius: number,
  visible: boolean
): void {
  if (
    current.x === x &&
    current.y === y &&
    current.radius === radius &&
    current.visible === visible
  ) {
    return;
  }
  current.x = x;
  current.y = y;
  current.radius = radius;
  current.visible = visible;
  for (const listener of listeners) listener(current);
}

/** Subscribe to marker movement. Returns an unsubscribe function. */
export function onMarkerScreen(listener: (point: MarkerScreenPoint) => void): () => void {
  listeners.add(listener);
  listener(current); // deliver the current value immediately
  return () => {
    listeners.delete(listener);
  };
}
