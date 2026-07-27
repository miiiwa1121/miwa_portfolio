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
  /** False when the marker is behind the camera or off-screen. */
  visible: boolean;
};

const current: MarkerScreenPoint = { x: 0, y: 0, visible: false };
const listeners = new Set<(point: MarkerScreenPoint) => void>();

/** Called by the scene each frame. Cheap no-op when nothing moved. */
export function publishMarkerScreen(x: number, y: number, visible: boolean): void {
  if (current.x === x && current.y === y && current.visible === visible) return;
  current.x = x;
  current.y = y;
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
