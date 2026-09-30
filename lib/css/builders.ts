export type GradientStop = {
  color: string;
  position: number;
};

export type GradientOptions = {
  angle: number;
  radialShape: "circle" | "ellipse";
  stops: GradientStop[];
  type: "linear" | "radial";
};

export type BoxShadowOptions = {
  blur: number;
  color: string;
  inset: boolean;
  opacity: number;
  spread: number;
  x: number;
  y: number;
};

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function buildGradient(options: GradientOptions): string {
  if (options.stops.length < 2) {
    throw new Error("A gradient needs at least two colour stops.");
  }
  const stops = options.stops
    .map((stop) => ({
      color: normalizeHex(stop.color),
      position: clamp(stop.position, 0, 100),
    }))
    .sort((left, right) => left.position - right.position)
    .map((stop) => `${stop.color} ${formatNumber(stop.position)}%`)
    .join(", ");
  if (options.type === "radial") {
    return `radial-gradient(${options.radialShape} at center, ${stops})`;
  }
  const angle = ((finiteOr(options.angle, 0) % 360) + 360) % 360;
  return `linear-gradient(${formatNumber(angle)}deg, ${stops})`;
}

export function buildBoxShadow(options: BoxShadowOptions): string {
  const prefix = options.inset ? "inset " : "";
  const x = clamp(options.x, -200, 200);
  const y = clamp(options.y, -200, 200);
  const blur = clamp(options.blur, 0, 200);
  const spread = clamp(options.spread, -100, 100);
  const color = hexToRgba(options.color, options.opacity);
  return `${prefix}${formatNumber(x)}px ${formatNumber(y)}px ${formatNumber(blur)}px ${formatNumber(spread)}px ${color}`;
}

export function hexToRgba(color: string, opacity: number): string {
  const normalized = normalizeHex(color);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${formatNumber(clamp(opacity, 0, 1))})`;
}

function normalizeHex(color: string): string {
  if (!HEX_COLOR_PATTERN.test(color)) {
    throw new Error(`Invalid six-digit hex colour: ${color}`);
  }
  return color.toLowerCase();
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, finiteOr(value, minimum)));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function formatNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}
