export type GradientType = "linear" | "radial";

export type TextAlignment = "left" | "center" | "right";

export interface GradientPreset {
  name: string;
  startColor: string;
  endColor: string;
  angle: number;
  type: GradientType;
}

export interface LogoOptions {
  image: HTMLImageElement | null;
  scale: number; // 0.1 to 1.0 (10% to 100% of banner height)
  x: number; // X position in pixels
  y: number; // Y position in pixels
}

export interface TextOptions {
  title: string;
  subtitle: string;
  titleFontSize: number;
  subtitleFontSize: number;
  color: string;
  alignment: TextAlignment;
  titleY: number; // Y position for title
  subtitleY: number; // Y position for subtitle
}

export interface BannerOptions {
  gradientStartColor: string;
  gradientEndColor: string;
  gradientAngle: number; // 0-360 degrees
  gradientType: GradientType;
  logo: LogoOptions;
  text: TextOptions;
}
