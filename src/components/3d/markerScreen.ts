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
