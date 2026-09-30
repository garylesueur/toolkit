export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropPosition = {
  centerX: number;
  centerY: number;
  zoom: number;
};

export function constrainCropPosition(
  position: CropPosition,
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number,
): CropPosition {
  const base = getBaseCropSize(imageWidth, imageHeight, aspectRatio);
  const zoom = Math.max(1, position.zoom);
  const width = base.width / zoom;
  const height = base.height / zoom;

  return {
    centerX: Math.min(
      imageWidth - width / 2,
      Math.max(width / 2, position.centerX),
    ),
    centerY: Math.min(
      imageHeight - height / 2,
      Math.max(height / 2, position.centerY),
    ),
    zoom,
  };
}

export function getCropArea(
  position: CropPosition,
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number,
): CropArea {
  const constrained = constrainCropPosition(
    position,
    imageWidth,
    imageHeight,
    aspectRatio,
  );
  const base = getBaseCropSize(imageWidth, imageHeight, aspectRatio);
  const width = base.width / constrained.zoom;
  const height = base.height / constrained.zoom;

  return {
    x: constrained.centerX - width / 2,
    y: constrained.centerY - height / 2,
    width,
    height,
  };
}

function getBaseCropSize(
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number,
) {
  if (imageWidth / imageHeight > aspectRatio) {
    return { width: imageHeight * aspectRatio, height: imageHeight };
  }

  return { width: imageWidth, height: imageWidth / aspectRatio };
}
