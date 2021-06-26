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
  point: Coordinate;
  normal: Coordinate;
};
export type Coordinate = { x: number; y: number };

export function scale(coord: Coordinate, amount: number): Coordinate {
  return {
    x: coord.x * amount,
    y: coord.y * amount,
  };
}

export function rotate(coord: Coordinate, angle: number): Coordinate {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: c * coord.x - s * coord.y,
    y: s * coord.x + c * coord.y,
  };
}

// +1: Globe Earth
//  0: Flat Earth
// -1: Hollow Earth
export function computeParameters(control: number): EarthParams {
  if (Math.abs(control) < 1e-4) {
    // Flat Earth
    const surfaceAt = (latitude: number) => ({
      point: { x: -latitude / 90, y: 0 },
      normal: { x: 0, y: 1 },
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

    const surfaceAt = (latitude: number) => {
      const angle =
        Math.sign(control) * ((latitude / 90) * segmentAngle + 0.5 * Math.PI);
      const cAngle = Math.cos(angle);
      const sAngle = Math.sin(angle);
      return {
        point: {
          x: circleScale * cAngle,
          y: circleOffset + circleScale * sAngle,
        },
        normal: {
          x: Math.sign(control) * cAngle,
          y: Math.sign(control) * sAngle,
        },
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
