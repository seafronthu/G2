import { bisectLeft, sort } from 'd3-array';

function constrain(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

export function isOrdinalScale(scale) {
  return scale.getBandWidth;
}

export function invert(scale, x, start) {
  if (!isOrdinalScale(scale)) return scale.invert(x);
  const { adjustedRange } = scale;
  const { domain } = scale.getOptions();
  const offset = start ? -1 : 0;
  const step = scale.getStep();
  const range = start ? adjustedRange : adjustedRange.map((d) => d + step);
  // R[i0 - 1] < x <= R[i0]
  const i0 = bisectLeft(range, x);
  const i1 = constrain(i0 + offset, 0, domain.length - 1);
  return domain[i1];
}

export function domainOf(scale, values) {
  if (!isOrdinalScale(scale)) return sort(values);
  const { domain } = scale.getOptions();
  const [v1, v2] = values;
  const start = domain.indexOf(v1);
  const end = domain.indexOf(v2);
  return domain.slice(start, end + 1);
}

export function selectionOf(x, y, x1, y1, scale, coordinate) {
  const { x: scaleX, y: scaleY } = scale;
  const abstractDomain = (point, start) => {
    const [x, y] = coordinate.invert(point);
    return [invert(scaleX, x, start), invert(scaleY, y, start)];
  };
  const p0 = abstractDomain([x, y], true);
  const p1 = abstractDomain([x1, y1], false);
  const domainX = domainOf(scaleX, [p0[0], p1[0]]);
  const domainY = domainOf(scaleY, [p0[1], p1[1]]);
  return [domainX, domainY];
}

export function pixelsOf(selection, scale, coordinate) {
  const [[minX, maxX], [minY, maxY]] = selection;
  const { x: scaleX, y: scaleY } = scale;
  const p0 = [scaleX.map(minX), scaleY.map(minY)];
  const maybeStep = (scale) => (scale.getStep ? scale.getStep() : 0);
  const p1 = [
    scaleX.map(maxX) + maybeStep(scaleX),
    scaleY.map(maxY) + maybeStep(scaleY),
  ];
  const [x, y] = coordinate.map(p0);
  const [x1, y1] = coordinate.map(p1);
  return [x, y, x1, y1];
}
