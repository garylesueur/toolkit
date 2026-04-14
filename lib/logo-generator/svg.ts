import { resolveIcon } from "./state";
import type { GradientDirection, IconLogoConfig, LogoConfig } from "./types";

const VIEWBOX_SIZE = 512;

// Base font sizes per letter count at textSize=100
const BASE_FONT_SIZES: Record<number, number> = {
  1: 280,
  2: 220,
  3: 180,
};

const GRADIENT_COORDS: Record<
  GradientDirection,
  { x1: string; y1: string; x2: string; y2: string }
> = {
  "to-br": { x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
  "to-b": { x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
  "to-r": { x1: "0%", y1: "0%", x2: "100%", y2: "0%" },
  "to-bl": { x1: "100%", y1: "0%", x2: "0%", y2: "100%" },
};

interface BackgroundColors {
  color1: string;
  color2: string;
  direction: GradientDirection;
  isGradient: boolean;
}

interface BackgroundConfig {
  preset: {
    color1: string;
    color2: string;
    direction: GradientDirection;
    mode: string;
  };
  useCustomColors: boolean;
  customColor1: string;
  customColor2: string;
  customDirection: GradientDirection;
  borderRadius: number;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getActiveColors(config: BackgroundConfig): BackgroundColors {
  if (config.useCustomColors) {
    const isGradient = config.customColor1 !== config.customColor2;
    return {
      color1: config.customColor1,
      color2: config.customColor2,
      direction: config.customDirection,
      isGradient,
    };
  }

  return {
    color1: config.preset.color1,
    color2: config.preset.color2,
    direction: config.preset.direction,
    isGradient: config.preset.mode === "gradient",
  };
}

function renderBackground(config: BackgroundConfig): {
  defs: string;
  rect: string;
} {
  const { color1, color2, direction, isGradient } = getActiveColors(config);
  const radius = Math.min(config.borderRadius, VIEWBOX_SIZE / 2);
  const gradientCoords = GRADIENT_COORDS[direction];

  const clipRect = `<clipPath id="clip"><rect width="${VIEWBOX_SIZE}" height="${VIEWBOX_SIZE}" rx="${radius}" ry="${radius}" /></clipPath>`;

  const gradientDef = isGradient
    ? `<linearGradient id="bg" x1="${gradientCoords.x1}" y1="${gradientCoords.y1}" x2="${gradientCoords.x2}" y2="${gradientCoords.y2}">
      <stop offset="0%" stop-color="${color1}" />
      <stop offset="100%" stop-color="${color2}" />
    </linearGradient>`
    : "";

  const fill = isGradient ? "url(#bg)" : color1;

  return {
    defs: `<defs>\n    ${clipRect}\n    ${gradientDef}\n  </defs>`,
    rect: `<rect width="${VIEWBOX_SIZE}" height="${VIEWBOX_SIZE}" rx="${radius}" ry="${radius}" fill="${fill}" />`,
  };
}

export function generateLogoSvg(config: LogoConfig): string {
  const { defs, rect } = renderBackground(config);
  const baseFontSize = BASE_FONT_SIZES[config.letters.length] ?? 180;
  const fontSize = Math.round(baseFontSize * (config.textSize / 100));
  const letters = escapeXml(config.letters);

  // Text baseline: positive padding moves text up, negative pushes it below
  const textY = VIEWBOX_SIZE - config.bottomPadding;
  const textX = VIEWBOX_SIZE / 2 + config.horizontalOffset;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}">
  ${defs}
  ${rect}
  <text
    x="${textX}"
    y="${textY}"
    text-anchor="middle"
    dominant-baseline="auto"
    font-family="${config.font.family}"
    font-weight="${config.font.weight}"
    font-size="${fontSize}"
    letter-spacing="0.05em"
    fill="${config.textColor}"
    clip-path="url(#clip)"
  >${letters}</text>
</svg>`;
}

export function generateIconLogoSvg(config: IconLogoConfig): string {
  const { defs, rect } = renderBackground(config);
  const icon = resolveIcon(config.iconName);
  const pathData =
    config.iconVariant === "fill" ? icon.fillPath : icon.linePath;

  // Scale the 24x24 icon to fit within the padded area
  const availableSize =
    (VIEWBOX_SIZE - 2 * config.iconPadding) * (config.iconSize / 100);
  const scale = availableSize / 24;
  const offset = (VIEWBOX_SIZE - availableSize) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}">
  ${defs}
  ${rect}
  <g clip-path="url(#clip)">
    <g transform="translate(${offset}, ${offset}) scale(${scale})">
      <path d="${pathData}" fill="${config.iconColor}" />
    </g>
  </g>
</svg>`;
}

/** Google Fonts CSS URL for a given font family */
export function googleFontUrl(googleFamily: string): string {
  return `https://fonts.googleapis.com/css2?family=${googleFamily}&display=swap`;
}
