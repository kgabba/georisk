/**
 * Проверка пересечения геометрии риска с полигоном участка (WGS84, градусы).
 * Без внешних пакетов — чтобы не зависеть от установки @turf/boolean-intersects в dev-томе.
 */

type Position = GeoJSON.Position;
type Ring = Position[];

const EPS = 1e-10;

function numBetween(a: number, b: number, x: number): boolean {
  return x >= Math.min(a, b) - EPS && x <= Math.max(a, b) + EPS;
}

function onSeg(ax: number, ay: number, bx: number, by: number, px: number, py: number): boolean {
  return (
    orientation(ax, ay, bx, by, px, py) === 0 &&
    numBetween(ax, bx, px) &&
    numBetween(ay, by, py)
  );
}

/** Площадь удвоенного треугольника (ориентация). */
function orientation(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  const v = (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
  if (v > EPS) return 1;
  if (v < -EPS) return -1;
  return 0;
}

function segIntersect(a: Position, b: Position, c: Position, d: Position): boolean {
  const [ax, ay] = a;
  const [bx, by] = b;
  const [cx, cy] = c;
  const [dx, dy] = d;
  const o1 = orientation(ax, ay, bx, by, cx, cy);
  const o2 = orientation(ax, ay, bx, by, dx, dy);
  const o3 = orientation(cx, cy, dx, dy, ax, ay);
  const o4 = orientation(cx, cy, dx, dy, bx, by);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSeg(ax, ay, bx, by, cx, cy)) return true;
  if (o2 === 0 && onSeg(ax, ay, bx, by, dx, dy)) return true;
  if (o3 === 0 && onSeg(cx, cy, dx, dy, ax, ay)) return true;
  if (o4 === 0 && onSeg(cx, cy, dx, dy, bx, by)) return true;
  return false;
}

function ringBBox(ring: Ring): [number, number, number, number] | null {
  if (!ring.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of ring) {
    const x = p[0];
    const y = p[1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

function bboxOverlap(a: [number, number, number, number], b: [number, number, number, number]): boolean {
  return !(a[2] < b[0] - EPS || a[0] > b[2] + EPS || a[3] < b[1] - EPS || a[1] > b[3] + EPS);
}

function geomBBox(geom: GeoJSON.Geometry): [number, number, number, number] | null {
  switch (geom.type) {
    case "Point":
      return [geom.coordinates[0], geom.coordinates[1], geom.coordinates[0], geom.coordinates[1]];
    case "MultiPoint":
      return ringBBox(geom.coordinates as Ring);
    case "LineString":
      return ringBBox(geom.coordinates as Ring);
    case "MultiLineString": {
      let bb: [number, number, number, number] | null = null;
      for (const line of geom.coordinates) {
        const r = ringBBox(line as Ring);
        if (!r) continue;
        bb = bb ? mergeBBox(bb, r) : r;
      }
      return bb;
    }
    case "Polygon": {
      const outer = geom.coordinates[0];
      return outer ? ringBBox(outer) : null;
    }
    case "MultiPolygon": {
      let bb: [number, number, number, number] | null = null;
      for (const poly of geom.coordinates) {
        const outer = poly[0];
        const r = outer ? ringBBox(outer) : null;
        if (!r) continue;
        bb = bb ? mergeBBox(bb, r) : r;
      }
      return bb;
    }
    case "GeometryCollection": {
      let bb: [number, number, number, number] | null = null;
      for (const g of geom.geometries) {
        const r = geomBBox(g);
        if (!r) continue;
        bb = bb ? mergeBBox(bb, r) : r;
      }
      return bb;
    }
    default:
      return null;
  }
}

function mergeBBox(
  a: [number, number, number, number],
  b: [number, number, number, number]
): [number, number, number, number] {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

/** Ray casting; границу считаем «внутри» (касание = пересечение). */
function pointInRingOrOnEdge(px: number, py: number, ring: Ring): boolean {
  const n = ring.length;
  if (n < 3) return false;
  for (let i = 0; i < n - 1; i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[i + 1];
    if (onSeg(ax, ay, bx, by, px, py)) return true;
  }
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[n - 1];
  if ((fx !== lx || fy !== ly) && onSeg(lx, ly, fx, fy, px, py)) return true;

  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (Math.abs(yj - yi) < EPS) continue;
    if ((yi > py) === (yj > py)) continue;
    const xInt = ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (px < xInt - EPS) inside = !inside;
  }
  return inside;
}

type PolyPart = { outer: Ring; holes: Ring[] };

function polyParts(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): PolyPart[] {
  if (geom.type === "Polygon") {
    const [outer, ...holes] = geom.coordinates;
    return outer ? [{ outer, holes: holes || [] }] : [];
  }
  const out: PolyPart[] = [];
  for (const rings of geom.coordinates) {
    const [outer, ...holes] = rings;
    if (outer) out.push({ outer, holes: holes || [] });
  }
  return out;
}

function pointInPolyPart(px: number, py: number, part: PolyPart): boolean {
  if (!pointInRingOrOnEdge(px, py, part.outer)) return false;
  for (const h of part.holes) {
    if (pointInRingOrOnEdge(px, py, h)) return false;
  }
  return true;
}

function ringEdges(ring: Ring): Array<[Position, Position]> {
  const edges: Array<[Position, Position]> = [];
  const n = ring.length;
  if (n < 2) return edges;
  const last = ring[n - 1];
  const first = ring[0];
  const closed = last[0] === first[0] && last[1] === first[1];
  const limit = closed ? n - 1 : n;
  for (let i = 0; i < limit; i++) {
    edges.push([ring[i], ring[(i + 1) % n]]);
  }
  return edges;
}

function edgesCrossAny(edgesA: Array<[Position, Position]>, edgesB: Array<[Position, Position]>): boolean {
  for (const [a1, a2] of edgesA) {
    for (const [b1, b2] of edgesB) {
      if (segIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function polygonPartsIntersects(a: PolyPart[], b: PolyPart[]): boolean {
  for (const pa of a) {
    const bbA = ringBBox(pa.outer);
    if (!bbA) continue;
    for (const pb of b) {
      const bbB = ringBBox(pb.outer);
      if (!bbB || !bboxOverlap(bbA, bbB)) continue;

      for (const p of pa.outer) {
        if (pointInPolyPart(p[0], p[1], pb)) return true;
      }
      for (const p of pb.outer) {
        if (pointInPolyPart(p[0], p[1], pa)) return true;
      }

      const ea = ringEdges(pa.outer);
      const eb = ringEdges(pb.outer);
      if (edgesCrossAny(ea, eb)) return true;

      for (const h of pa.holes) {
        for (const p of pb.outer) {
          if (pointInRingOrOnEdge(p[0], p[1], h)) return true;
        }
      }
      for (const h of pb.holes) {
        for (const p of pa.outer) {
          if (pointInRingOrOnEdge(p[0], p[1], h)) return true;
        }
      }
    }
  }
  return false;
}

function lineIntersectsPolyParts(line: Ring, parts: PolyPart[]): boolean {
  const bbL = ringBBox(line);
  if (!bbL) return false;
  for (const part of parts) {
    const bbP = ringBBox(part.outer);
    if (!bbP || !bboxOverlap(bbL, bbP)) continue;

    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      const midx = (a[0] + b[0]) / 2;
      const midy = (a[1] + b[1]) / 2;
      if (pointInPolyPart(a[0], a[1], part) || pointInPolyPart(b[0], b[1], part)) return true;
      if (pointInPolyPart(midx, midy, part)) return true;
      for (const [p1, p2] of ringEdges(part.outer)) {
        if (segIntersect(a, b, p1, p2)) return true;
      }
      for (const h of part.holes) {
        for (const [p1, p2] of ringEdges(h)) {
          if (segIntersect(a, b, p1, p2)) return true;
        }
      }
    }
  }
  return false;
}

function multiLineIntersectsPolyParts(lines: Position[][], parts: PolyPart[]): boolean {
  for (const line of lines) {
    if (lineIntersectsPolyParts(line as Ring, parts)) return true;
  }
  return false;
}

function geometryIntersectsParcel(parcelGeom: GeoJSON.Geometry, other: GeoJSON.Geometry): boolean {
  const bbP = geomBBox(parcelGeom);
  const bbO = geomBBox(other);
  if (!bbP || !bbO || !bboxOverlap(bbP, bbO)) return false;

  const parcelPoly =
    parcelGeom.type === "Polygon"
      ? polyParts(parcelGeom)
      : parcelGeom.type === "MultiPolygon"
        ? polyParts(parcelGeom)
        : null;
  if (!parcelPoly?.length) return false;

  switch (other.type) {
    case "Polygon":
    case "MultiPolygon":
      return polygonPartsIntersects(parcelPoly, polyParts(other));
    case "LineString":
      return lineIntersectsPolyParts(other.coordinates as Ring, parcelPoly);
    case "MultiLineString":
      return multiLineIntersectsPolyParts(other.coordinates as Position[][], parcelPoly);
    case "Point":
      return parcelPoly.some((part) => pointInPolyPart(other.coordinates[0], other.coordinates[1], part));
    case "MultiPoint":
      return other.coordinates.some(([x, y]) =>
        parcelPoly.some((part) => pointInPolyPart(x, y, part))
      );
    case "GeometryCollection":
      return other.geometries.some((g) => geometryIntersectsParcel(parcelGeom, g));
    default:
      return false;
  }
}

export function geojsonIntersectsParcel(parcel: GeoJSON.Feature, other: GeoJSON.Feature): boolean {
  if (!parcel.geometry || !other.geometry) return false;
  try {
    return geometryIntersectsParcel(parcel.geometry, other.geometry);
  } catch {
    return false;
  }
}
