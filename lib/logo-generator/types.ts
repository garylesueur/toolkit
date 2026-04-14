export type BackgroundMode = "solid" | "gradient";

export type GradientDirection = "to-br" | "to-b" | "to-r" | "to-bl";

export type LogoMode = "letters" | "icon";

export type IconVariant = "line" | "fill";

export interface ColorPreset {
  name: string;
  mode: BackgroundMode;
  color1: string;
  color2: string;
  direction: GradientDirection;
}

export interface FontOption {
  name: string;
  family: string;
  weight: number;
  googleFamily: string;
}

export interface LogoConfig {
  letters: string;
  preset: ColorPreset;
  customColor1: string;
  customColor2: string;
  customDirection: GradientDirection;
  useCustomColors: boolean;
  borderRadius: number;
  font: FontOption;
  /** 0–200, where 100 is the default base size */
  textSize: number;
  /** Pixels from the bottom edge; negative pushes text below the shape */
  bottomPadding: number;
  /** Horizontal offset in viewBox units; 0 = centred, negative = left, positive = right */
  horizontalOffset: number;
  /** Text fill colour */
  textColor: string;
}

export interface IconLogoConfig {
  iconName: string;
  iconVariant: IconVariant;
  /** 30–200, where 100 is the default base size */
  iconSize: number;
  /** Padding around the icon within the shape (viewBox units) */
  iconPadding: number;
  /** Fill colour for the icon path */
  iconColor: string;
  preset: ColorPreset;
  customColor1: string;
  customColor2: string;
  customDirection: GradientDirection;
  useCustomColors: boolean;
  borderRadius: number;
}
