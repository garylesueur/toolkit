import * as babelPlugin from "prettier/plugins/babel";
import * as estreePlugin from "prettier/plugins/estree";
import * as htmlPlugin from "prettier/plugins/html";
import * as postcssPlugin from "prettier/plugins/postcss";
import * as prettier from "prettier/standalone";
import { minify as minifyJavaScript } from "terser";

export type WebCodeLanguage = "html" | "css" | "javascript";
export type WebCodeAction = "format" | "minify";
export type WebCodeIndent = 2 | 4;

export interface WebCodeTransformOptions {
  language: WebCodeLanguage;
  action: WebCodeAction;
  indent?: WebCodeIndent;
}

async function loadHtmlMinifier() {
  if (typeof window === "undefined") {
    return (await import("html-minifier-terser")).minify;
  }

  return (await import("html-minifier-terser/dist/htmlminifier.esm.bundle"))
    .minify;
}

async function formatCode(
  input: string,
  language: WebCodeLanguage,
  indent: WebCodeIndent,
): Promise<string> {
  switch (language) {
    case "html":
      return prettier.format(input, {
        parser: "html",
        plugins: [htmlPlugin],
        tabWidth: indent,
        useTabs: false,
      });
    case "css":
      return prettier.format(input, {
        parser: "css",
        plugins: [postcssPlugin],
        tabWidth: indent,
        useTabs: false,
      });
    case "javascript":
      return prettier.format(input, {
        parser: "babel",
        plugins: [babelPlugin, estreePlugin],
        tabWidth: indent,
        useTabs: false,
        semi: true,
      });
  }
}

async function minifyCode(
  input: string,
  language: WebCodeLanguage,
): Promise<string> {
  switch (language) {
    case "html": {
      const minifyHtml = await loadHtmlMinifier();
      return minifyHtml(input, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeAttributeQuotes: false,
        removeEmptyAttributes: false,
        minifyCSS: true,
        minifyJS: true,
      });
    }
    case "css": {
      const minifyHtml = await loadHtmlMinifier();
      const wrapped = await minifyHtml(`<style>${input}</style>`, {
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
      });
      return wrapped.slice("<style>".length, -"</style>".length);
    }
    case "javascript": {
      const result = await minifyJavaScript(input, {
        compress: true,
        mangle: false,
        format: { comments: false },
      });
      if (typeof result.code !== "string") {
        throw new Error("JavaScript minification produced no output");
      }
      return result.code;
    }
  }
}

export async function transformWebCode(
  input: string,
  options: WebCodeTransformOptions,
): Promise<string> {
  if (!input.trim()) return "";
  const indent = options.indent ?? 2;
  if (indent !== 2 && indent !== 4) {
    throw new RangeError("Indentation must be 2 or 4 spaces");
  }

  try {
    return options.action === "format"
      ? await formatCode(input, options.language, indent)
      : await minifyCode(input, options.language);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown syntax error";
    throw new Error(
      `Could not ${options.action} ${options.language}: ${message}`,
    );
  }
}

export function measureCodeChange(input: string, output: string) {
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(input).byteLength;
  const outputBytes = encoder.encode(output).byteLength;
  const reduction =
    inputBytes === 0
      ? 0
      : Math.round((1 - outputBytes / inputBytes) * 1000) / 10;

  return { inputBytes, outputBytes, reduction };
}
