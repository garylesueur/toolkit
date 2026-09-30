export type ImageHandoffArtifact = {
  blob: Blob;
  filename: string;
  sourceHref: string;
};

export type ImageHandoffDestination = {
  href: string;
  label: string;
};

export type StoredImageHandoff = ImageHandoffArtifact & {
  createdAt: number;
  version: 1;
};
