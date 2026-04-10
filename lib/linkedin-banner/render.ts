import type { BannerOptions } from "./types";

const BANNER_WIDTH = 1584;
const BANNER_HEIGHT = 396;

function createGradient(
  ctx: CanvasRenderingContext2D,
  options: BannerOptions,
): CanvasGradient {
  const { gradientType, gradientStartColor, gradientEndColor, gradientAngle } =
    options;

  if (gradientType === "radial") {
    const gradient = ctx.createRadialGradient(
      BANNER_WIDTH / 2,
      BANNER_HEIGHT / 2,
      0,
      BANNER_WIDTH / 2,
      BANNER_HEIGHT / 2,
      Math.max(BANNER_WIDTH, BANNER_HEIGHT),
    );
    gradient.addColorStop(0, gradientStartColor);
    gradient.addColorStop(1, gradientEndColor);
    return gradient;
  }

  // Linear gradient
  const angleRad = (gradientAngle * Math.PI) / 180;
  const halfWidth = BANNER_WIDTH / 2;
  const halfHeight = BANNER_HEIGHT / 2;
  const length = Math.sqrt(
    BANNER_WIDTH * BANNER_WIDTH + BANNER_HEIGHT * BANNER_HEIGHT,
  );

  const x1 = halfWidth - Math.cos(angleRad) * length;
  const y1 = halfHeight - Math.sin(angleRad) * length;
  const x2 = halfWidth + Math.cos(angleRad) * length;
  const y2 = halfHeight + Math.sin(angleRad) * length;

  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, gradientStartColor);
  gradient.addColorStop(1, gradientEndColor);
  return gradient;
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  logo: BannerOptions["logo"],
): void {
  if (!logo.image) return;

  const logoHeight = BANNER_HEIGHT * logo.scale;
  const aspectRatio = logo.image.width / logo.image.height;
  const logoWidth = logoHeight * aspectRatio;

  ctx.save();
  ctx.drawImage(logo.image, logo.x, logo.y, logoWidth, logoHeight);
  ctx.restore();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: BannerOptions["text"],
): void {
  const { title, subtitle, titleFontSize, subtitleFontSize, color, alignment } =
    text;

  ctx.fillStyle = color;
  ctx.font = `bold ${titleFontSize}px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  ctx.textAlign = alignment;
  ctx.textBaseline = "top";

  // Calculate X position based on alignment
  let titleX: number;
  let subtitleX: number;
  const textStartX = BANNER_WIDTH * 0.4; // Start text at 40% from left to avoid profile overlay

  switch (alignment) {
    case "left":
      titleX = textStartX;
      subtitleX = textStartX;
      break;
    case "center":
      titleX = (textStartX + BANNER_WIDTH) / 2;
      subtitleX = (textStartX + BANNER_WIDTH) / 2;
      break;
    case "right":
      titleX = BANNER_WIDTH - 40; // 40px padding from right
      subtitleX = BANNER_WIDTH - 40;
      break;
  }

  if (title.trim()) {
    ctx.fillText(title, titleX, text.titleY);
  }

  if (subtitle.trim()) {
    ctx.font = `${subtitleFontSize}px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    ctx.fillText(subtitle, subtitleX, text.subtitleY);
  }
}

export function renderBanner(
  canvas: HTMLCanvasElement,
  options: BannerOptions,
): void {
  canvas.width = BANNER_WIDTH;
  canvas.height = BANNER_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Draw gradient background
  const gradient = createGradient(ctx, options);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BANNER_WIDTH, BANNER_HEIGHT);

  // Draw logo
  drawLogo(ctx, options.logo);

  // Draw text
  drawText(ctx, options.text);
}

export function downloadBannerPng(
  canvas: HTMLCanvasElement,
  filename: string,
): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
