export type YamlToolMode = "format-yaml" | "yaml-to-json" | "json-to-yaml";

export type JsonIndentSize = 2 | 0;

export type TransformResult =
  | { output: string; error: null }
  | { output: ""; error: string };
