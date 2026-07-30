import { describe, expect, it } from "vitest";
import {
  GESTURE_GAP_MS,
  WHEEL_THRESHOLD,
  initialWheelState,
  stepForWheel,
  type WheelState,
} from "./cardWheel";

/** Runs a whole gesture through and reports every step it produced. */
function feed(events: [deltaY: number, at: number][], from: WheelState = initialWheelState()) {
  let state = from;
  const steps: number[] = [];
  for (const [deltaY, at] of events) {
    const result = stepForWheel(state, deltaY, at);
    state = result.state;
    if (result.step !== 0) steps.push(result.step);
  }
  return { state, steps };
}

/** A trackpad flick: `count` events 16ms apart, then a momentum tail. */
function flick(deltaY: number, count: number, startAt = 0): [number, number][] {
  const events: [number, number][] = [];
  for (let i = 0; i < count; i++) events.push([deltaY, startAt + i * 16]);
  // The tail: smaller and smaller deltas, still arriving well inside the gap
  // that would end the gesture.
  for (let i = 0; i < 30; i++) {
    events.push([deltaY / (i + 2), startAt + (count + i) * 16]);
  }
  return events;
}

describe("stepForWheel", () => {
  it("says nothing until the travel adds up", () => {
    expect(feed([
      [20, 0],
      [20, 30],
      [20, 60],
    ]).steps).toEqual([]);
  });

  it("steps once the travel crosses the threshold", () => {
    expect(feed([
      [WHEEL_THRESHOLD / 2, 0],
      [WHEEL_THRESHOLD / 2, 30],
    ]).steps).toEqual([-1]);
  });

  it("steps the other way when scrolled up", () => {
    expect(feed([[-WHEEL_THRESHOLD, 0]]).steps).toEqual([1]);
  });

  // The direction the whole feature hangs on: scrolling down should bring the
  // next card up from below, which is the same step the card's swipe-up
  // gesture asks for.
  it("reads scrolling down as the next spot round the island", () => {
    expect(feed([[WHEEL_THRESHOLD, 0]]).steps).toEqual([-1]);
  });

  it("steps on the very first event when it is big enough", () => {
    // A mouse wheel click arrives as one large event with no history at all.
    expect(feed([[100, 0]]).steps).toEqual([-1]);
  });

  // The property the lock exists for. This gesture carries enough travel for
  // twenty cards; the camera can only be in one place, so it buys one.
  it("gives one flick one card, however hard it was thrown", () => {
    expect(feed(flick(60, 40)).steps).toEqual([-1]);
  });

  it("is not fooled by a long momentum tail", () => {
    // The tail alone still adds up past the threshold several times over.
    expect(feed(flick(200, 10)).steps).toEqual([-1]);
  });

  it("gives a second flick its own card once the wheel has fallen quiet", () => {
    const first = flick(60, 20);
    const restAt = first[first.length - 1][1] + GESTURE_GAP_MS + 50;
    expect(feed([...first, ...flick(60, 20, restAt)]).steps).toEqual([-1, -1]);
  });

  it("lets the second flick go the other way", () => {
    const first = flick(60, 20);
    const restAt = first[first.length - 1][1] + GESTURE_GAP_MS + 50;
    expect(feed([...first, ...flick(-60, 20, restAt)]).steps).toEqual([-1, 1]);
  });

  // Two separate nudges, each too small on its own, should stay too small —
  // otherwise a stray flick from a minute ago decides the next one.
  it("forgets travel banked before a pause", () => {
    const nearly = WHEEL_THRESHOLD - 10;
    expect(feed([
      [nearly, 0],
      [nearly, GESTURE_GAP_MS + 50],
    ]).steps).toEqual([]);
  });

  it("keeps counting across the gaps inside one gesture", () => {
    const third = WHEEL_THRESHOLD / 3 + 1;
    expect(feed([
      [third, 0],
      [third, GESTURE_GAP_MS - 20],
      [third, (GESTURE_GAP_MS - 20) * 2],
    ]).steps).toEqual([-1]);
  });

  it("does not step on a stray reversal inside a gesture", () => {
    expect(feed([
      [50, 0],
      [-50, 16],
      [50, 32],
      [-50, 48],
    ]).steps).toEqual([]);
  });

  it("is pure — the state handed in is never written to", () => {
    const state = initialWheelState();
    const snapshot = { ...state };
    stepForWheel(state, 500, 1000);
    expect(state).toEqual(snapshot);
  });
});
