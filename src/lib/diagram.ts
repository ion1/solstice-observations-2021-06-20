import type { Vector } from "vec-la-fp";

export const FLAT = Symbol("flat");
export const CURVED = Symbol("curved");
export const CONVEX = Symbol("convex");
export const CONCAVE = Symbol("concave");

export type EarthParams =
  | ({ type: typeof FLAT } & CommonEarthParams)
  | ({ type: typeof CURVED } & CommonEarthParams & CurvedEarthParams);
export type CommonEarthParams = {
  surfaceAt: (latitude: number) => SurfaceAt;
  width: number;
  height: number;
};
export type CurvedEarthParams = {
  curvatureType: typeof CONVEX | typeof CONCAVE;
  segmentAngle: number;
  circleScale: number;
  circleOffset: number;
};
export type SurfaceAt = {
  point: Vector;
  normal: Vector;
};

// +1: Globe Earth
//  0: Flat Earth
// -1: Hollow Earth
export function computeParameters(control: number): EarthParams {
  if (Math.abs(control) < 1e-4) {
    // Flat Earth
    const surfaceAt: (latitude: number) => SurfaceAt = (latitude) => ({
      point: [-latitude / 90, 0],
      normal: [0, 1],
    });
    return { type: FLAT, surfaceAt, width: 1, height: 0 };
  } else {
    const curvatureType = control >= 0 ? CONVEX : CONCAVE;

    /*
      Given an angle corresponding to a circle segment representing a
      hypothesis for the Earth's curvature, in order to render the segment
      with a constant width, circleScale = 1 / sin(a).

      The height (when drawn starting from the top) of the circle segment:

      height = circleScale * (1 - cos(a))
             = (1 - cos(a)) / sin(a)
             = tan(a/2)
      atan(height) = a/2
      a = 2 atan(height).

      This results in smooth movement, calculate the angle in this way.
      However, it looks nicer if the segment has a constant path length rather
      than width. Use circleScale = 1 / a to actually scale the segment.
      */

    const segmentAngle = 2 * Math.atan(Math.abs(control));
    const circleScale = 1.0 / segmentAngle;
    const earthWidth = circleScale * Math.sin(segmentAngle);
    const earthHeight =
      Math.sign(control) * circleScale * (1 - Math.cos(segmentAngle));
    const circleOffset =
      Math.sign(earthHeight) * -circleScale + 0.5 * earthHeight;

    const surfaceAt: (latitude: number) => SurfaceAt = (latitude) => {
      const angle =
        Math.sign(control) * ((latitude / 90) * segmentAngle + 0.5 * Math.PI);
      const cAngle = Math.cos(angle);
      const sAngle = Math.sin(angle);
      return {
        point: [circleScale * cAngle, circleOffset + circleScale * sAngle],
        normal: [Math.sign(control) * cAngle, Math.sign(control) * sAngle],
      };
    };

    return {
      type: CURVED,
      curvatureType,
      width: earthWidth,
      height: earthHeight,
      segmentAngle,
      circleScale,
      circleOffset,
      surfaceAt,
    };
  }
}
