import type { Mermaid } from "mermaid";

interface MermaidImageNode {
  img?: string;
}

interface MermaidImageDatabase {
  getData: () => { nodes: MermaidImageNode[] };
}

const LOCAL_IMAGE_ERROR =
  "This diagram uses an external or unsupported image. To keep your file private, use embedded PNG, JPEG, GIF, or WebP data images instead.";

function isEmbeddedRasterImage(image: string): boolean {
  const match =
    /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(
      image,
    );
  if (!match) return false;

  let bytes: string;
  try {
    bytes = atob(match[2]);
  } catch {
    return false;
  }

  // Check the content as well as the MIME type: SVG data must never reach
  // Mermaid's Image loader, even if it claims to be a raster image.
  switch (match[1].toLowerCase()) {
    case "png":
      return bytes.startsWith("\x89PNG\r\n\x1a\n");
    case "jpeg":
      return bytes.startsWith("\xff\xd8\xff");
    case "gif":
      return bytes.startsWith("GIF87a") || bytes.startsWith("GIF89a");
    case "webp":
      return bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
    default:
      return false;
  }
}

export function validateMermaidImageNodes(nodes: readonly MermaidImageNode[]) {
  for (const node of nodes) {
    if (node.img && !isEmbeddedRasterImage(node.img)) {
      throw new Error(LOCAL_IMAGE_ERROR);
    }
  }
}

export async function validateMermaidImages(mermaid: Mermaid, source: string) {
  const diagram = await mermaid.mermaidAPI.getDiagramFromText(source);
  if (!diagram.type.startsWith("flowchart")) return;

  // Read parsed values so YAML quoting, escapes, and repeated declarations
  // cannot bypass validation. Rendering loads these images before SVG output.
  const database = diagram.db as typeof diagram.db & MermaidImageDatabase;
  validateMermaidImageNodes(database.getData().nodes);
}
