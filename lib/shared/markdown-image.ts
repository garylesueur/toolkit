/** Only raster images embedded in the input may load automatically. */
export function isEmbeddedMarkdownImage(source: string): boolean {
  return /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/]+={0,2}$/i.test(
    source,
  );
}
