import { describe, expect, it } from "vitest";
import { MAX_FLIGHT_STEP, advanceFlight, beginFlight, type Flight } from "./cameraFlight";
import {
  AUTO_ORBIT_SPEED,
  NEAR_ORBIT_RADIUS,
  ORBIT_UP,
  orbitArcBetween,
  orbitPose,
  orbitStepFraction,
  type OrbitAngles,
} from "./cameraLayout";

const FRAME = 1 / 60;

/** A flight from one point on the free orbit to another — what `flyToOrbit` builds. */
function orbitFlight(from: OrbitAngles, to: OrbitAngles, duration = 1.6): Flight {
  return beginFlight({
    from: orbitPose(from.azimuth, from.polar, NEAR_ORBIT_RADIUS),
    to: orbitPose(to.azimuth, to.polar, NEAR_ORBIT_RADIUS),
    fromOffsetX: 0,
    toOffsetX: 0,
    fromOffsetY: 0,
    toOffsetY: 0,
    fromUp: ORBIT_UP,
    toUp: ORBIT_UP,
    duration,
    land: to,
  });
}

/** Run a flight to completion at a steady frame rate, and hand back its last frame. */
function flyToTheEnd(flight: Flight, delta = FRAME) {
  let frame = advanceFlight(flight, delta);
  let frames = 1;
  while (!frame.done) {
    frame = advanceFlight(flight, delta);
    frames += 1;
    if (frames > 10_000) throw new Error("flight never finished");
  }
  return { frame, frames };
}

describe("advanceFlight", () => {
  it("charges no time for the frame it starts on", () => {
    // A flight begins inside an effect — after one frame has been drawn, before
    // the next. Behind the detail page that gap is the idle heartbeat's full
    // second, which would spend most of a 1.6s flight before it was seen.
    const flight = orbitFlight({ azimuth: 0, polar: 1.2 }, { azimuth: 1, polar: 1.2 });
    const first = advanceFlight(flight, 0.9);
    expect(flight.elapsed).toBe(0);
    expect(first.done).toBe(false);
  });

  it("stretches rather than skips when frames arrive late", () => {
    // Headless SwiftShader renders this scene at ~3fps. The clamp keeps a slow
    // device from teleporting through a flight; it must not shorten one.
    const flight = orbitFlight({ azimuth: 0, polar: 1.2 }, { azimuth: 1, polar: 1.2 }, 1.6);
    advanceFlight(flight, 0); // prime
    advanceFlight(flight, 3);
    expect(flight.elapsed).toBe(MAX_FLIGHT_STEP);
  });

  it("holds still at both ends", () => {
    const from = { azimuth: 0, polar: 1.2 };
    const to = { azimuth: 2, polar: 0.9 };
    const flight = orbitFlight(from, to, 1.6);
    advanceFlight(flight, FRAME); // prime, still at t=0

    const opening = advanceFlight(flight, FRAME).pose;
    const startPose = orbitPose(from.azimuth, from.polar, NEAR_ORBIT_RADIUS);
    // Two frames in, an eased flight has barely left. A linear one would already
    // be 1.2% of the way, which is 25x further at this point on the curve.
    const moved = Math.hypot(opening[0] - startPose[0], opening[1] - startPose[1], opening[2] - startPose[2]);
    const wholeTrip = Math.hypot(
      orbitPose(to.azimuth, to.polar, NEAR_ORBIT_RADIUS)[0] - startPose[0],
      orbitPose(to.azimuth, to.polar, NEAR_ORBIT_RADIUS)[1] - startPose[1],
      orbitPose(to.azimuth, to.polar, NEAR_ORBIT_RADIUS)[2] - startPose[2]
    );
    expect(moved / wholeTrip).toBeLessThan(0.001);
  });

  it("arrives exactly on its destination", () => {
    const to = { azimuth: 2, polar: 0.9 };
    const flight = orbitFlight({ azimuth: 0, polar: 1.2 }, to);
    const { frame } = flyToTheEnd(flight);
    const destination = orbitPose(to.azimuth, to.polar, NEAR_ORBIT_RADIUS);
    frame.pose.forEach((value, i) => expect(value).toBeCloseTo(destination[i], 6));
  });
});

describe("the handover from a flight to the free orbit", () => {
  // `azimuthRef`/`polarRef` in Scene.tsx are a separate source of truth from the
  // camera's transform, and a flight writes the transform without touching them.
  // A flight that ends in the free orbit therefore has to say where it left the
  // camera, or the first idle frame damps from wherever the camera stood before
  // the flight and undoes most of the trip in one tick.

  it("says nothing until it has actually arrived", () => {
    const flight = orbitFlight({ azimuth: 0, polar: 1.2 }, { azimuth: 2, polar: 0.9 });
    let frame = advanceFlight(flight, FRAME);
    let midFlightFrames = 0;
    while (!frame.done) {
      expect(frame.landed).toBeNull();
      midFlightFrames += 1;
      frame = advanceFlight(flight, FRAME);
    }
    expect(midFlightFrames).toBeGreaterThan(30); // it really did fly, rather than finishing at once
    expect(frame.landed).toEqual({ azimuth: 2, polar: 0.9 });
  });

  it("says nothing for a flight into a section, which parks the camera instead", () => {
    const flight = beginFlight({
      from: orbitPose(0, 1.2, NEAR_ORBIT_RADIUS),
      to: [10, 4, 2, 8, 3, 1],
      fromOffsetX: 0,
      toOffsetX: 0,
      fromOffsetY: 0,
      toOffsetY: 0,
      fromUp: ORBIT_UP,
      toUp: [0, 0, 1],
      duration: 1.1,
      land: null,
    });
    const { frame } = flyToTheEnd(flight);
    expect(frame.done).toBe(true);
    expect(frame.landed).toBeNull();
  });

  it("leaves the idle drift with nothing to catch up on, from the far side of the planet", () => {
    // The worst case the logo can produce: the camera has drifted (or been
    // dragged) most of a lap away from the tour's start before HOME is pressed.
    const beforeFlight = { azimuth: 3.0, polar: 1.45 };
    const landing = { azimuth: -0.1, polar: 1.05 };

    const flight = orbitFlight(beforeFlight, landing);
    const { frame } = flyToTheEnd(flight);
    const resumed = frame.landed;
    expect(resumed).not.toBeNull();

    // The next idle frame: the tour target is where the flight put the camera,
    // because `tourURef` is frozen for the whole flight.
    const fraction = orbitStepFraction(resumed!, landing, FRAME);
    const stepped = {
      azimuth: resumed!.azimuth + (landing.azimuth - resumed!.azimuth) * fraction,
      polar: resumed!.polar + (landing.polar - resumed!.polar) * fraction,
    };

    // What breaking this looks like: the camera jumps, in one frame, by far more
    // than the idle drift could ever move it. Written against the drift's own
    // pace rather than against the implementation's damping constant — the point
    // is that nothing visible happens on this frame, not that some particular
    // fraction of some particular gap was applied.
    expect(orbitArcBetween(landing, stepped)).toBeLessThan(AUTO_ORBIT_SPEED * FRAME);

    // And for scale, so the size of what this prevents is on the record:
    // resuming from the pre-flight angle instead swings the camera 2.41 rad
    // (138°) on that one frame — some four thousand idle frames' worth.
    const strandedFraction = orbitStepFraction(beforeFlight, landing, FRAME);
    const stranded = {
      azimuth: beforeFlight.azimuth + (landing.azimuth - beforeFlight.azimuth) * strandedFraction,
      polar: beforeFlight.polar + (landing.polar - beforeFlight.polar) * strandedFraction,
    };
    expect(orbitArcBetween(landing, stranded)).toBeGreaterThan(100 * AUTO_ORBIT_SPEED * FRAME);
  });

  it("leaves nothing to catch up on for the ordinary trip out of a section either", () => {
    // Leaving a section pulls back to that area's own anchor on the tour. How
    // far that is from where the camera stood depends on where the idle drift
    // happened to be when the card was opened — which is what made this read as
    // an intermittent stutter rather than as a bug.
    const beforeFlight = { azimuth: 0.62, polar: 1.31 };
    const landing = { azimuth: 0.0, polar: 1.2 };

    const { frame } = flyToTheEnd(orbitFlight(beforeFlight, landing));
    const fraction = orbitStepFraction(frame.landed!, landing, FRAME);
    const stepped = {
      azimuth: frame.landed!.azimuth + (landing.azimuth - frame.landed!.azimuth) * fraction,
      polar: frame.landed!.polar + (landing.polar - frame.landed!.polar) * fraction,
    };
    expect(orbitArcBetween(landing, stepped)).toBeLessThan(AUTO_ORBIT_SPEED * FRAME);
  });
});
