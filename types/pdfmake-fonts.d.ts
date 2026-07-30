/**
 * pdfmake ships prebuilt font containers for the browser under `build/`. They
 * are plain JavaScript with no bundled types, but the shape is stable: a
 * virtual-filesystem map plus the font descriptors that reference it.
 */
declare module "pdfmake/build/standard-fonts/*" {
  const fontContainer: {
    vfs: Record<string, { data: string; encoding: string }>;
    fonts: Record<string, Record<string, string>>;
  };
  export default fontContainer;
}
