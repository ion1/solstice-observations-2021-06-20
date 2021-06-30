/** @jest-environment jsdom */
// This patches the window global provided by jsdom.
require("geometry-polyfill");

import * as fc from "fast-check";
import { infiniteStream } from "fast-check";

import { scaleRotate, ScaleRotate } from "../src/lib/scaleRotate";

function arbAngle(): fc.Arbitrary<number> {
  return fc.double({ min: -Math.PI, max: Math.PI });
}

function arbLength(): fc.Arbitrary<number> {
  return fc.double({ min: 1e-3, max: 1e3 });
}

/** An arbitrary point with coordinates between -1e4 and 1e4. */
function arbDOMPoint(): fc.Arbitrary<DOMPoint> {
  return fc
    .record({
      x: fc.double({ min: -1e4, max: 1e4 }),
      y: fc.double({ min: -1e4, max: 1e4 }),
    })
    .map(({ x, y }) => new DOMPoint(x, y));
}

/**
 * An arbitrary relative handle point like arbDOMPoint with coordinates not
 * closer than 1e-6.
 */
function arbHandleRel(): fc.Arbitrary<DOMPoint> {
  return fc
    .record({
      x: fc.double({ min: -1e4, max: 1e4 }).filter((n) => Math.abs(n) > 1e-6),
      y: fc.double({ min: -1e4, max: 1e4 }).filter((n) => Math.abs(n) > 1e-6),
    })
    .map(({ x, y }) => new DOMPoint(x, y));
}

function arbScaleRotate(): fc.Arbitrary<ScaleRotate> {
  return fc
    .record({
      pin: arbDOMPoint(),
      pos: arbDOMPoint(),
      prevPos: arbDOMPoint(),
    })
    .filter(
      ({ pin, pos, prevPos }) =>
        Math.abs(pos.x - pin.x) > 1e-6 &&
        Math.abs(pos.y - pin.y) > 1e-6 &&
        Math.abs(prevPos.x - pin.x) > 1e-6 &&
        Math.abs(prevPos.y - pin.y) > 1e-6
    );
}

function invertScaleRotate(sr: ScaleRotate): ScaleRotate {
  return {
    pin: sr.pin,
    pos: sr.prevPos,
    prevPos: sr.pos,
  };
}

function example(values: {
  point: DOMPoint;
  handleRel: DOMPoint;
  origin?: DOMPoint;
  scale?: number;
  rot?: number;
  twoSteps?: boolean;
}): { sr: ScaleRotate[]; expected: DOMPoint } {
  const { point, handleRel, origin, scale, rot, twoSteps } = {
    origin: new DOMPoint(),
    scale: 1,
    rot: 0,
    twoSteps: false,
    ...values,
  };

  const cosRot = Math.cos(rot);
  const sinRot = Math.sin(rot);
  const scale_2 = Math.sqrt(scale);
  const cosRot_2 = Math.cos(0.5 * rot);
  const sinRot_2 = Math.sin(0.5 * rot);

  const pin = origin;
  const pos = twoSteps
    ? new DOMPoint(
        origin.x + scale_2 * (cosRot_2 * handleRel.x - sinRot_2 * handleRel.y),
        origin.y + scale_2 * (sinRot_2 * handleRel.x + cosRot_2 * handleRel.y)
      )
    : new DOMPoint(
        origin.x + scale * (cosRot * handleRel.x - sinRot * handleRel.y),
        origin.y + scale * (sinRot * handleRel.x + cosRot * handleRel.y)
      );
  const prevPos = new DOMPoint(origin.x + handleRel.x, origin.y + handleRel.y);

  const sr = [{ pin, pos, prevPos }];
  if (twoSteps) {
    sr.push(sr[0]);
  }

  const expected = new DOMPoint(
    origin.x +
      scale * (cosRot * (point.x - origin.x) - sinRot * (point.y - origin.y)),
    origin.y +
      scale * (sinRot * (point.x - origin.x) + cosRot * (point.y - origin.y))
  );

  return { sr, expected };
}
describe("scaleRotate", () => {
  it("scales about origin correctly", () => {
    fc.assert(
      fc.property(
        fc.record({
          point: arbDOMPoint(),
          handleRel: arbHandleRel(),
          scale: arbLength(),
        }),
        (values) => {
          const { sr, expected } = example(values);
          const m = scaleRotate(sr);
          const actual = values.point.matrixTransform(m);
          expect(actual.x).toBeCloseTo(expected.x);
          expect(actual.y).toBeCloseTo(expected.y);
        }
      )
    );
  });

  it("scales about a point correctly", () => {
    fc.assert(
      fc.property(
        fc.record({
          point: arbDOMPoint(),
          handleRel: arbHandleRel(),
          origin: arbDOMPoint(),
          scale: arbLength(),
        }),
        (values) => {
          const { sr, expected } = example(values);
          const m = scaleRotate(sr);
          const actual = values.point.matrixTransform(m);
          expect(actual.x).toBeCloseTo(expected.x);
          expect(actual.y).toBeCloseTo(expected.y);
        }
      )
    );
  });

  it("rotates about origin correctly", () => {
    fc.assert(
      fc.property(
        fc.record({
          point: arbDOMPoint(),
          handleRel: arbHandleRel(),
          rot: arbAngle(),
        }),
        (values) => {
          const { sr, expected } = example(values);
          const m = scaleRotate(sr);
          const actual = values.point.matrixTransform(m);
          expect(actual.x).toBeCloseTo(expected.x);
          expect(actual.y).toBeCloseTo(expected.y);
        }
      )
    );
  });

  it("rotates about a point correctly", () => {
    fc.assert(
      fc.property(
        fc.record({
          point: arbDOMPoint(),
          handleRel: arbHandleRel(),
          origin: arbDOMPoint(),
          rot: arbAngle(),
        }),
        (values) => {
          const { sr, expected } = example(values);
          const m = scaleRotate(sr);
          const actual = values.point.matrixTransform(m);
          expect(actual.x).toBeCloseTo(expected.x);
          expect(actual.y).toBeCloseTo(expected.y);
        }
      )
    );
  });

  it("scales and rotates about a point correctly", () => {
    fc.assert(
      fc.property(
        fc.record({
          origin: arbDOMPoint(),
          handleRel: arbHandleRel(),
          point: arbDOMPoint(),
          scale: arbLength(),
          rot: arbAngle(),
        }),
        (values) => {
          const { sr, expected } = example(values);
          const m = scaleRotate(sr);
          const actual = values.point.matrixTransform(m);
          expect(actual.x).toBeCloseTo(expected.x);
          expect(actual.y).toBeCloseTo(expected.y);
        }
      )
    );
  });

  it("scales and rotates about a point correctly in two steps", () => {
    fc.assert(
      fc.property(
        fc.record({
          origin: arbDOMPoint(),
          handleRel: arbHandleRel(),
          point: arbDOMPoint(),
          scale: arbLength(),
          rot: arbAngle(),
        }),
        (values) => {
          const { sr, expected } = example({ ...values, twoSteps: true });
          const m = scaleRotate(sr);
          const actual = values.point.matrixTransform(m);
          expect(actual.x).toBeCloseTo(expected.x);
          expect(actual.y).toBeCloseTo(expected.y);
        }
      )
    );
  });

  it("has the same result when moving to an intermediate point first", () => {
    fc.assert(
      fc.property(
        fc.record({
          pin: arbDOMPoint(),
          prevPos: arbDOMPoint(),
          intermediatePos: arbDOMPoint(),
          pos: arbDOMPoint(),
          point: arbDOMPoint(),
        }),
        ({ pin, prevPos, intermediatePos, pos, point }) => {
          const mWithIntermediate = scaleRotate([
            { pin, prevPos, pos: intermediatePos },
            { pin, prevPos: intermediatePos, pos },
          ]);
          const mExpected = scaleRotate([{ pin, prevPos, pos }]);
          const pWithIntermediate = point.matrixTransform(mWithIntermediate);
          const pExpected = point.matrixTransform(mExpected);
          expect(pWithIntermediate.x).toBeCloseTo(pExpected.x);
          expect(pWithIntermediate.y).toBeCloseTo(pExpected.y);
        }
      )
    );
  });

  it("has the same result when moving two ends of a line in any order", () => {
    fc.assert(
      fc.property(
        fc.record({
          prevPosA: arbDOMPoint(),
          posA: arbDOMPoint(),
          prevPosB: arbDOMPoint(),
          posB: arbDOMPoint(),
          point: arbDOMPoint(),
        }),
        ({ prevPosA, posA, prevPosB, posB, point }) => {
          const mAFirst = scaleRotate([
            { pin: prevPosB, prevPos: prevPosA, pos: posA },
            { pin: posA, prevPos: prevPosB, pos: posB },
          ]);
          const mBFirst = scaleRotate([
            { pin: prevPosA, prevPos: prevPosB, pos: posB },
            { pin: posB, prevPos: prevPosA, pos: posA },
          ]);
          const pAFirst = point.matrixTransform(mAFirst);
          const pBFirst = point.matrixTransform(mBFirst);
          expect(pAFirst.x).toBeCloseTo(pBFirst.x);
          expect(pAFirst.y).toBeCloseTo(pBFirst.y);
        }
      )
    );
  });

  it("restores the original point when redoing the transformations in reverse", () => {
    fc.assert(
      fc.property(
        fc.record({
          sr: fc.array(arbScaleRotate()),
          point: arbDOMPoint(),
        }),
        ({ sr, point }) => {
          const srInverse = sr.map(invertScaleRotate).reverse();
          const m = scaleRotate([...sr, ...srInverse]);
          const actual = point.matrixTransform(m);
          expect(actual.x).toBeCloseTo(point.x);
          expect(actual.y).toBeCloseTo(point.y);
        }
      )
    );
  });
});
