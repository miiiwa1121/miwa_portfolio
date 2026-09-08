import { describe, expect, it } from "vitest";
import {
  GESTURE_GAP_MS,
  WHEEL_THRESHOLD,
  initialWheelState,
  stepForWheel,
  wheelPixels,
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

  // The bug this whole re-arming business exists for. A trackpad's momentum
  // runs for a second or two, and putting the fingers back on cancels it — so
  // the second flick's events carry straight on from the tail, with no pause
  // anywhere. Waiting for quiet meant the whole second flick was swallowed,
  // and whether a scroll did anything came down to whether it happened to land
  // on top of the last one's tail.
  it("gives a second flick its own card even when it lands on the last one's tail", () => {
    const first = flick(60, 20);
    const cut = first.slice(0, 20 + 8); // the flick, plus a chunk of its tail
    const resumeAt = cut[cut.length - 1][1] + 16;

    // Stated so this cannot quietly start passing for the other reason: there
    // is no pause here, which is the only thing that used to end a gesture.
    expect(resumeAt - cut[cut.length - 1][1]).toBeLessThan(GESTURE_GAP_MS);

    expect(feed([...cut, ...flick(60, 20, resumeAt)]).steps).toEqual([-1, -1]);
  });

  // The events at the start of a hard flick climb every bit as steeply as
  // fingers coming back down would — 240 after 88 is nearly a trebling. What
  // separates them is that a flick on its way up has not decayed from anything
  // yet. Without that half of the test, this gesture buys two cards.
  it("does not read a flick's own build-up as a second gesture", () => {
    const ramp: [number, number][] = [2, 5, 13, 34, 88, 240, 240, 240].map(
      (deltaY, i) => [deltaY, i * 16]
    );
    const tail = flick(240, 1, ramp.length * 16).slice(1);
    expect(feed([...ramp, ...tail]).steps).toEqual([-1]);
  });

  // Tails do not decay perfectly smoothly — rounding and the odd late frame
  // leave one event a shade bigger than the one before it. A shade is not a
  // hand: only a step change in size counts as the wheel being driven again.
  it("is not fooled by a tail that wobbles on its way down", () => {
    const wobbly: [number, number][] = [
      200, 200, 200, 200, 200,
      90, 60, 70, 45, 50, 30, 33, 20, 22, 12, 14, 8, 9, 5, 6, 3, 4, 2, 3,
    ].map((deltaY, i) => [deltaY, i * 16]);
    expect(feed(wobbly).steps).toEqual([-1]);
  });
});

describe("wheelPixels", () => {
  it("leaves pixel-mode travel alone", () => {
    expect(wheelPixels(100, 0)).toBe(100);
    expect(wheelPixels(-37.5, 0)).toBe(-37.5);
  });

  // The two units the same mouse notch arrives in: 100 pixels in Chrome, 3
  // lines in Firefox. They have to come out close enough that a threshold
  // calibrated on one is a sane figure in the other.
  it("makes a line-mode notch worth about the same as a pixel-mode one", () => {
    expect(wheelPixels(3, 1)).toBeGreaterThan(80);
    expect(wheelPixels(3, 1)).toBeLessThan(120);
  });

  it("reads page-mode travel as a screenful, not as three pixels", () => {
    expect(wheelPixels(1, 2)).toBeGreaterThan(200);
  });

  it("keeps the direction", () => {
    expect(wheelPixels(-3, 1)).toBeLessThan(0);
    expect(wheelPixels(-1, 2)).toBeLessThan(0);
  });
});

describe("stepForWheel, fed real wheel events", () => {
  // A whole mouse notch used to be worth 3 against a threshold of 80, so the
  // card needed twenty-seven of them: not a stiff control, a dead one.
  it("steps on one notch of a line-mode wheel", () => {
    const notch = wheelPixels(3, 1);
    expect(feed([[notch, 0]]).steps).toEqual([-1]);
  });
});
