export type ScaleRotate = {
  pin: DOMPoint;
  pos: DOMPoint;
  prevPos: DOMPoint;
};

/**
 * Apply a sequence of transformations where each scales and rotates by a
 * point moving about a pinned point.
 *
 * Each transformation in the sequence is specified in the same coordinate
 * space.
 */
export function scaleRotate(scaleRotations: ScaleRotate[]): DOMMatrix {
  const matrix = new DOMMatrix();

  for (const { pin, pos, prevPos } of scaleRotations) {
    if (
      (pos.x - prevPos.x) * (pos.x - prevPos.x) +
        (pos.y - prevPos.y) * (pos.y - prevPos.y) <
      1e-12
    ) {
      continue;
    }

    const translateToOrigin = new DOMMatrix().translateSelf(-pin.x, -pin.y);
    const posO = pos.matrixTransform(translateToOrigin);
    const prevPosO = prevPos.matrixTransform(translateToOrigin);

    const length = Math.sqrt(posO.x * posO.x + posO.y * posO.y);
    const prevLength = Math.sqrt(
      prevPosO.x * prevPosO.x + prevPosO.y * prevPosO.y
    );
    if (length < 1e-6 || prevLength < 1e-6) {
      throw new Error(
        `Extremely small length: length=${length} prevLength=${prevLength}`
      );
    }
    const lengthFactor = length / prevLength;
    const scale = new DOMMatrix().scaleSelf(lengthFactor);

    const angle = Math.atan2(posO.y, posO.x);
    const prevAngle = Math.atan2(prevPosO.y, prevPosO.x);
    const angleDiff = angle - prevAngle;
    const rotate = new DOMMatrix().rotateSelf(180 * (angleDiff / Math.PI));

    const transform = DOMMatrix.fromMatrix(translateToOrigin)
      .preMultiplySelf(scale)
      .preMultiplySelf(rotate)
      .preMultiplySelf(translateToOrigin.inverse());

    matrix.preMultiplySelf(transform);
  }

  return matrix;
}
