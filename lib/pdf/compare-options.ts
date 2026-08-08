export type PixelImage = {
  data: Uint8ClampedArray;
  height: number;
  width: number;
};

export type PixelDifference = PixelImage & {
  changedPixels: number;
  meanDelta: number;
  percentChanged: number;
  totalPixels: number;
};

function channelAt(
  image: PixelImage | null,
  x: number,
  y: number,
  channel: number,
) {
  if (!image || x >= image.width || y >= image.height) return 255;
  return image.data[(y * image.width + x) * 4 + channel];
}

export function comparePixels(
  left: PixelImage | null,
  right: PixelImage | null,
  threshold = 24,
): PixelDifference {
  if (!left && !right) throw new Error("At least one page image is required.");
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 255) {
    throw new Error("The comparison threshold must be between 0 and 255.");
  }
  const width = Math.max(left?.width ?? 0, right?.width ?? 0);
  const height = Math.max(left?.height ?? 0, right?.height ?? 0);
  const data = new Uint8ClampedArray(width * height * 4);
  let changedPixels = 0;
  let deltaTotal = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const outputIndex = (y * width + x) * 4;
      const redDelta = Math.abs(
        channelAt(left, x, y, 0) - channelAt(right, x, y, 0),
      );
      const greenDelta = Math.abs(
        channelAt(left, x, y, 1) - channelAt(right, x, y, 1),
      );
      const blueDelta = Math.abs(
        channelAt(left, x, y, 2) - channelAt(right, x, y, 2),
      );
      const delta = Math.max(redDelta, greenDelta, blueDelta);
      deltaTotal += (redDelta + greenDelta + blueDelta) / 3;
      if (delta > threshold) {
        changedPixels++;
        data[outputIndex] = 236;
        data[outputIndex + 1] = 72;
        data[outputIndex + 2] = 153;
        data[outputIndex + 3] = 255;
      } else {
        const grey = Math.round(
          (channelAt(left ?? right, x, y, 0) +
            channelAt(left ?? right, x, y, 1) +
            channelAt(left ?? right, x, y, 2)) /
            3,
        );
        const faded = Math.round(245 - (255 - grey) * 0.18);
        data[outputIndex] = faded;
        data[outputIndex + 1] = faded;
        data[outputIndex + 2] = faded;
        data[outputIndex + 3] = 255;
      }
    }
  }
  const totalPixels = width * height;
  return {
    changedPixels,
    data,
    height,
    meanDelta: totalPixels ? deltaTotal / totalPixels : 0,
    percentChanged: totalPixels ? (changedPixels / totalPixels) * 100 : 0,
    totalPixels,
    width,
  };
}

export function comparisonSummary(
  pages: Array<{ percentChanged: number }>,
  changedThreshold = 0.01,
) {
  const changedPages = pages.filter(
    (page) => page.percentChanged >= changedThreshold,
  ).length;
  return {
    changedPages,
    identicalPages: pages.length - changedPages,
    totalPages: pages.length,
  };
}
