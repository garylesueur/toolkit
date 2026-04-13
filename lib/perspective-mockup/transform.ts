import type { Point2D, Quad } from "./types";

/**
 * Solve Ax = b via Gaussian elimination with partial pivoting.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(M[row][col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / pivot;
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  const x = Array.from<number>({ length: n }).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = sum / M[i][i];
  }

  return x;
}

/**
 * Compute a 3×3 homography mapping src quad to dst quad.
 * Returns row-major [h1..h8, 1] with h9 normalised to 1.
 */
export function computeHomography(src: Quad, dst: Quad): number[] {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = src[i];
    const { x: dx, y: dy } = dst[i];

    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
    b.push(dy);
  }

  const h = solveLinearSystem(A, b);
  return [...h, 1];
}

export function applyHomography(H: number[], p: Point2D): Point2D {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return {
    x: (H[0] * p.x + H[1] * p.y + H[2]) / w,
    y: (H[3] * p.x + H[4] * p.y + H[5]) / w,
  };
}

/**
 * Draw a single textured triangle by computing an affine transform
 * from source (image) coords to destination (canvas) coords, clipping
 * to the destination triangle, and drawing the whole source image.
 */
function drawTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx0: number,
  sy0: number,
  sx1: number,
  sy1: number,
  sx2: number,
  sy2: number,
  dx0: number,
  dy0: number,
  dx1: number,
  dy1: number,
  dx2: number,
  dy2: number,
): void {
  const det =
    sx0 * (sy1 - sy2) - sy0 * (sx1 - sx2) + (sx1 * sy2 - sx2 * sy1);
  if (Math.abs(det) < 1e-10) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dx0, dy0);
  ctx.lineTo(dx1, dy1);
  ctx.lineTo(dx2, dy2);
  ctx.closePath();
  ctx.clip();

  // Affine: [a c e; b d f; 0 0 1] maps (sx,sy) → (dx,dy)
  const a =
    (dx0 * (sy1 - sy2) - sy0 * (dx1 - dx2) + (dx1 * sy2 - dx2 * sy1)) / det;
  const b =
    (dy0 * (sy1 - sy2) - sy0 * (dy1 - dy2) + (dy1 * sy2 - dy2 * sy1)) / det;
  const c =
    (sx0 * (dx1 - dx2) - dx0 * (sx1 - sx2) + (sx1 * dx2 - sx2 * dx1)) / det;
  const d =
    (sx0 * (dy1 - dy2) - dy0 * (sx1 - sx2) + (sx1 * dy2 - sx2 * dy1)) / det;
  const e =
    (sx0 * (sy1 * dx2 - sy2 * dx1) -
      sy0 * (sx1 * dx2 - sx2 * dx1) +
      dx0 * (sx1 * sy2 - sx2 * sy1)) /
    det;
  const f =
    (sx0 * (sy1 * dy2 - sy2 * dy1) -
      sy0 * (sx1 * dy2 - sx2 * dy1) +
      dy0 * (sx1 * sy2 - sx2 * sy1)) /
    det;

  ctx.setTransform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/**
 * Render a perspective-transformed image into an arbitrary quad
 * using homography-based subdivision.
 */
export function renderPerspectiveImage(
  ctx: CanvasRenderingContext2D,
  srcImage: HTMLImageElement,
  dstCorners: Quad,
  subdivisions: number,
): void {
  const srcW = srcImage.naturalWidth;
  const srcH = srcImage.naturalHeight;

  const srcQuad: Quad = [
    { x: 0, y: 0 },
    { x: srcW, y: 0 },
    { x: srcW, y: srcH },
    { x: 0, y: srcH },
  ];

  const H = computeHomography(srcQuad, dstCorners);
  const n = subdivisions;

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u0 = (i / n) * srcW;
      const v0 = (j / n) * srcH;
      const u1 = ((i + 1) / n) * srcW;
      const v1 = ((j + 1) / n) * srcH;

      const d00 = applyHomography(H, { x: u0, y: v0 });
      const d10 = applyHomography(H, { x: u1, y: v0 });
      const d11 = applyHomography(H, { x: u1, y: v1 });
      const d01 = applyHomography(H, { x: u0, y: v1 });

      // Two triangles per cell
      drawTexturedTriangle(
        ctx,
        srcImage,
        u0, v0, u1, v0, u0, v1,
        d00.x, d00.y, d10.x, d10.y, d01.x, d01.y,
      );
      drawTexturedTriangle(
        ctx,
        srcImage,
        u1, v0, u1, v1, u0, v1,
        d10.x, d10.y, d11.x, d11.y, d01.x, d01.y,
      );
    }
  }
}
