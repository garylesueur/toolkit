declare module "html-minifier-terser/dist/htmlminifier.esm.bundle" {
  import type { Options } from "html-minifier-terser";

  export function minify(input: string, options?: Options): Promise<string>;
}
