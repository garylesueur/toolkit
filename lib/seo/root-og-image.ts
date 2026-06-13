/** Stable share image for the home page — static file avoids Twitter issues with dynamic OG URLs. */
export const ROOT_OG_IMAGE_PATH = "/og/toolkit.png";

export const ROOT_OG_IMAGE = {
  url: ROOT_OG_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: "Toolkit — Developer utilities",
  type: "image/png",
} as const;
