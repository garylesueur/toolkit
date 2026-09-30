export type AppIconPlatform = "ios" | "expo-android";

export type AppIconSource = HTMLImageElement;

export type AppIconBundleOptions = {
  platforms: AppIconPlatform[];
  backgroundColor: string;
  iconPaddingPercent: number;
  adaptivePaddingPercent: number;
};

export type IosIconTarget = {
  filename: string;
  idiom: "iphone" | "ipad" | "ios-marketing";
  pointSize: string;
  scale: "1x" | "2x" | "3x";
  pixelSize: number;
};

export type IconBundleHandoff = {
  filename: string;
  svg: string;
};
