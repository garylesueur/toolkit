import { marked } from "marked";
import type { Token, Tokens } from "marked";
import type {
  Alignment,
  Content,
  ContentText,
  CustomTableLayout,
  TableCell,
} from "pdfmake/interfaces";

import { sanitiseGlyphs } from "./glyphs";
import type { FontFamily, Theme } from "./themes";
import { getTheme } from "./themes";
import type { MarkdownPdfOptions } from "./types";

/**
 * Converts marked's token tree straight to a pdfmake document definition.
 * Going via HTML would mean parsing it back out again — GFM tables, task lists
 * and strikethrough all arrive here already structured.
 */

/** Inline formatting inherited from enclosing tokens. */
type InlineContext = {
  bold: boolean;
  italics: boolean;
  strike: boolean;
  link: string | null;
};

const EMPTY_CONTEXT: InlineContext = {
  bold: false,
  italics: false,
  strike: false,
  link: null,
};

type BuildState = {
  theme: Theme;
  warnings: string[];
  /** Characters with no glyph in any bundled font, collected for one summary warning. */
  droppedGlyphs: Set<string>;
};

const HEADING_LEVELS = 6;

/** Indent applied per level of blockquote or nested list. */
const NESTED_INDENT = 14;

function headingSize(theme: Theme, depth: number): number {
  const index = Math.min(Math.max(depth, 1), HEADING_LEVELS) - 1;
  return Math.round(theme.baseFontSize * theme.headingScale[index] * 10) / 10;
}

function inlineNodes(
  tokens: Token[],
  context: InlineContext,
  state: BuildState,
): Content[] {
  const nodes: Content[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "text": {
        const text = token as Tokens.Text;
        // Nested tokens are present when the text contains further inline markup.
        if (text.tokens && text.tokens.length > 0) {
          nodes.push(...inlineNodes(text.tokens, context, state));
        } else {
          nodes.push(styledText(text.text, context, state));
        }
        break;
      }
      case "escape": {
        nodes.push(styledText((token as Tokens.Escape).text, context, state));
        break;
      }
      case "strong": {
        const strong = token as Tokens.Strong;
        nodes.push(
          ...inlineNodes(strong.tokens, { ...context, bold: true }, state),
        );
        break;
      }
      case "em": {
        const em = token as Tokens.Em;
        nodes.push(
          ...inlineNodes(em.tokens, { ...context, italics: true }, state),
        );
        break;
      }
      case "del": {
        const del = token as Tokens.Del;
        nodes.push(
          ...inlineNodes(del.tokens, { ...context, strike: true }, state),
        );
        break;
      }
      case "codespan": {
        const code = token as Tokens.Codespan;
        nodes.push({
          text: prepareText(code.text, state, state.theme.codeFont),
          font: state.theme.codeFont,
          color: state.theme.colours.code,
          background: state.theme.colours.codeBackground,
          bold: context.bold,
          italics: context.italics,
          ...(context.link ? { link: context.link } : {}),
        });
        break;
      }
      case "link": {
        const link = token as Tokens.Link;
        nodes.push(
          ...inlineNodes(link.tokens, { ...context, link: link.href }, state),
        );
        break;
      }
      case "image": {
        // Inline images can't sit inside a text run; fall back to the alt text.
        const image = token as Tokens.Image;
        state.warnings.push(
          `Inline image "${image.href}" was rendered as its alt text — only block-level images are drawn.`,
        );
        nodes.push(styledText(image.text || image.href, context, state));
        break;
      }
      case "checkbox": {
        // Task-list marker. In a loose list marked nests this inside the item's
        // paragraph, so it has to be handled here as well as in `blockNodes`.
        nodes.push(checkboxMarker(token));
        break;
      }
      case "br": {
        nodes.push({ text: "\n" });
        break;
      }
      case "html": {
        // Raw HTML has no PDF equivalent; keep the source visible rather than
        // silently dropping content the author wrote on purpose.
        const html = token as Tokens.HTML;
        const trimmed = html.text.trim();
        if (trimmed.length > 0) {
          state.warnings.push("Raw HTML was kept as literal text.");
          nodes.push(styledText(html.text, context, state));
        }
        break;
      }
      default: {
        const raw =
          "raw" in token && typeof token.raw === "string" ? token.raw : "";
        if (raw.length > 0) nodes.push(styledText(raw, context, state));
      }
    }
  }

  return nodes;
}

function styledText(
  text: string,
  context: InlineContext,
  state: BuildState,
): Content {
  return {
    text: prepareText(text, state, state.theme.bodyFont),
    bold: context.bold,
    italics: context.italics,
    ...(context.strike ? { decoration: "lineThrough" as const } : {}),
    ...(context.link
      ? { link: context.link, color: state.theme.colours.link }
      : {}),
  };
}

/**
 * Rendered as literal brackets rather than ☐/☑, because those glyphs are absent
 * from the PDF standard fonts and from pdfmake's subset of Roboto.
 */
function checkboxMarker(token: Token): Content {
  const checked = "checked" in token && token.checked === true;
  return { text: checked ? "[x] " : "[ ] " };
}

/** marked escapes a handful of entities in token text; undo them for the PDF. */
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|nbsp|#39|#x27);/g,
    (match) => ENTITIES[match] ?? match,
  );
}

/**
 * The single gate every piece of source text passes through on its way into the
 * PDF: entity decoding, then glyph substitution for characters the target font
 * cannot draw. `family` matters because the standard PDF fonts are limited to
 * WinAnsi while the bundled Roboto covers considerably more.
 */
function prepareText(
  text: string,
  state: BuildState,
  family: FontFamily,
): string {
  const result = sanitiseGlyphs(decodeEntities(text), family !== "Roboto");

  if (result.substituted) {
    state.warnings.push(
      "Some symbols (arrows, ticks, and similar) were replaced with plain-text equivalents — the bundled fonts have no glyphs for them.",
    );
  }
  for (const char of result.dropped) {
    state.droppedGlyphs.add(char);
  }

  return result.text;
}

function codeBlockLayout(theme: Theme): CustomTableLayout {
  return {
    hLineWidth: () => 0,
    vLineWidth: () => 0,
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 6,
    paddingBottom: () => 6,
    fillColor: () => theme.colours.codeBackground,
  };
}

function quoteLayout(theme: Theme): CustomTableLayout {
  return {
    hLineWidth: () => 0,
    // Only the leading edge is drawn, giving the familiar quote bar.
    vLineWidth: (i) => (i === 0 ? 3 : 0),
    vLineColor: () => theme.colours.quoteBar,
    paddingLeft: () => 10,
    paddingRight: () => 0,
    paddingTop: () => 2,
    paddingBottom: () => 2,
  };
}

function tableLayout(theme: Theme): CustomTableLayout {
  return {
    hLineWidth: () => 0.75,
    vLineWidth: () => 0.75,
    hLineColor: () => theme.colours.rule,
    vLineColor: () => theme.colours.rule,
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 4,
    paddingBottom: () => 4,
    fillColor: (rowIndex) =>
      rowIndex === 0 ? theme.colours.tableHeaderBackground : null,
  };
}

function alignmentOf(align: "center" | "left" | "right" | null): Alignment {
  return align ?? "left";
}

function tableCell(cell: Tokens.TableCell, state: BuildState): TableCell {
  return {
    text: inlineNodes(cell.tokens, EMPTY_CONTEXT, state),
    alignment: alignmentOf(cell.align),
    bold: cell.header,
  };
}

function isContentText(node: Content | undefined): node is ContentText {
  return (
    typeof node === "object" &&
    node !== null &&
    !Array.isArray(node) &&
    "text" in node
  );
}

function listItemContent(
  item: Tokens.ListItem,
  state: BuildState,
  depth: number,
): Content {
  /**
   * marked emits a `checkbox` token for task items. In a loose list it sits
   * inside the item's paragraph, where `inlineNodes` renders it; in a tight
   * list it is a sibling block, which would put the marker on its own line —
   * so it is lifted out here and folded into the first line of content.
   */
  const [head, ...rest] = item.tokens;
  const leadingCheckbox = head?.type === "checkbox" ? head : null;
  const blocks = blockNodes(
    leadingCheckbox ? rest : item.tokens,
    state,
    depth + 1,
  );

  if (leadingCheckbox) {
    const marker = checkboxMarker(leadingCheckbox);
    const first = blocks[0];

    if (isContentText(first)) {
      const { text, ...attributes } = first;
      blocks[0] = {
        ...attributes,
        text: Array.isArray(text) ? [marker, ...text] : [marker, text],
      };
    } else {
      blocks.unshift(marker);
    }
  }

  if (blocks.length === 1) return blocks[0];
  return { stack: blocks };
}

function blockNodes(
  tokens: Token[],
  state: BuildState,
  depth: number,
): Content[] {
  const { theme } = state;
  const nodes: Content[] = [];
  const gap = Math.round(theme.baseFontSize * 0.6);

  for (const token of tokens) {
    switch (token.type) {
      case "space": {
        break;
      }
      case "heading": {
        const heading = token as Tokens.Heading;
        const size = headingSize(theme, heading.depth);
        nodes.push({
          text: inlineNodes(heading.tokens, EMPTY_CONTEXT, state),
          fontSize: size,
          bold: true,
          font: theme.headingFont,
          color: theme.colours.heading,
          margin: [0, heading.depth === 1 ? 0 : gap * 1.4, 0, gap * 0.6],
          lineHeight: 1.15,
        });
        break;
      }
      case "paragraph": {
        const paragraph = token as Tokens.Paragraph;
        const onlyImage =
          paragraph.tokens.length === 1 && paragraph.tokens[0].type === "image";

        if (onlyImage) {
          const image = paragraph.tokens[0] as Tokens.Image;
          nodes.push(imageNode(image, state, gap));
          break;
        }

        nodes.push({
          text: inlineNodes(paragraph.tokens, EMPTY_CONTEXT, state),
          margin: [0, 0, 0, gap],
        });
        break;
      }
      case "text": {
        const text = token as Tokens.Text;
        nodes.push({
          text: text.tokens
            ? inlineNodes(text.tokens, EMPTY_CONTEXT, state)
            : prepareText(text.text, state, theme.bodyFont),
          margin: [0, 0, 0, gap * 0.35],
        });
        break;
      }
      case "code": {
        const code = token as Tokens.Code;
        nodes.push({
          table: {
            widths: ["*"],
            body: [
              [
                {
                  text: prepareText(code.text, state, theme.codeFont),
                  font: theme.codeFont,
                  fontSize: theme.baseFontSize * 0.85,
                  color: theme.colours.text,
                  preserveLeadingSpaces: true,
                  lineHeight: 1.25,
                },
              ],
            ],
          },
          layout: codeBlockLayout(theme),
          margin: [0, 0, 0, gap],
        });
        break;
      }
      case "blockquote": {
        const quote = token as Tokens.Blockquote;
        nodes.push({
          table: {
            widths: ["*"],
            body: [
              [
                {
                  stack: blockNodes(quote.tokens, state, depth + 1),
                  color: theme.colours.muted,
                  italics: true,
                },
              ],
            ],
          },
          layout: quoteLayout(theme),
          margin: [0, 0, 0, gap],
        });
        break;
      }
      case "list": {
        const list = token as Tokens.List;
        const items = list.items.map((item) =>
          listItemContent(item, state, depth),
        );

        if (list.ordered) {
          nodes.push({
            ol: items,
            start: typeof list.start === "number" ? list.start : 1,
            margin: [depth > 0 ? NESTED_INDENT : 0, 0, 0, gap],
          });
        } else {
          nodes.push({
            ul: items,
            // Task lists carry their own [x] marker, so drop the bullet.
            type: list.items.every((item) => item.task) ? "none" : undefined,
            margin: [depth > 0 ? NESTED_INDENT : 0, 0, 0, gap],
          });
        }
        break;
      }
      case "table": {
        const table = token as Tokens.Table;
        const body: TableCell[][] = [
          table.header.map((cell) => tableCell(cell, state)),
          ...table.rows.map((row) => row.map((cell) => tableCell(cell, state))),
        ];

        nodes.push({
          table: {
            headerRows: 1,
            widths: table.header.map(() => "*"),
            body,
            dontBreakRows: true,
          },
          layout: tableLayout(theme),
          margin: [0, 0, 0, gap],
        });
        break;
      }
      case "hr": {
        nodes.push({
          canvas: [
            {
              type: "line",
              x1: 0,
              y1: 0,
              x2: 515 - theme.pageMargins[0] - theme.pageMargins[2] + 96,
              y2: 0,
              lineWidth: 1,
              lineColor: theme.colours.rule,
            },
          ],
          margin: [0, gap * 0.5, 0, gap * 1.2],
        });
        break;
      }
      case "html": {
        const html = token as Tokens.HTML;
        if (html.text.trim().length > 0) {
          state.warnings.push("Raw HTML blocks were kept as literal text.");
          nodes.push({
            text: prepareText(html.text.trimEnd(), state, theme.codeFont),
            font: theme.codeFont,
            fontSize: theme.baseFontSize * 0.85,
            color: theme.colours.muted,
            margin: [0, 0, 0, gap],
          });
        }
        break;
      }
      case "def": {
        // Link reference definitions produce no visible output.
        break;
      }
      default: {
        break;
      }
    }
  }

  return nodes;
}

const DATA_URI_PATTERN = /^data:image\/(png|jpe?g);base64,/i;

/**
 * Only data URIs are drawn. Fetching remote images would mean the server making
 * arbitrary outbound requests on behalf of whoever supplied the markdown, which
 * is an SSRF hole in the MCP route — so those are reported instead.
 */
function imageNode(
  image: Tokens.Image,
  state: BuildState,
  gap: number,
): Content {
  if (DATA_URI_PATTERN.test(image.href)) {
    return { image: image.href, width: 420, margin: [0, 0, 0, gap] };
  }

  state.warnings.push(
    `Image "${image.href}" was skipped — only inline data: images are embedded.`,
  );

  return {
    text: image.text ? `[image: ${image.text}]` : `[image: ${image.href}]`,
    color: state.theme.colours.muted,
    italics: true,
    margin: [0, 0, 0, gap],
  };
}

export type DocDefinitionResult = {
  docDefinition: Record<string, unknown>;
  warnings: string[];
};

export function buildDocDefinition(
  markdown: string,
  options: MarkdownPdfOptions,
): DocDefinitionResult {
  const theme = getTheme(options.theme);
  const state: BuildState = { theme, warnings: [], droppedGlyphs: new Set() };

  const tokens = marked.lexer(markdown, { gfm: true });
  const content = blockNodes(tokens, state, 0);

  const footerTitle = prepareText(options.title, state, theme.bodyFont).trim();

  const docDefinition: Record<string, unknown> = {
    pageSize: options.pageSize,
    pageMargins: theme.pageMargins,
    content,
    defaultStyle: {
      font: theme.bodyFont,
      fontSize: theme.baseFontSize,
      lineHeight: theme.lineHeight,
      color: theme.colours.text,
    },
    info: footerTitle.length > 0 ? { title: footerTitle } : undefined,
  };

  if (options.includePageNumbers) {
    docDefinition.footer = (
      currentPage: number,
      pageCount: number,
    ): Content => ({
      columns: [
        {
          text: footerTitle,
          alignment: "left",
          color: theme.colours.muted,
          fontSize: theme.baseFontSize * 0.8,
        },
        {
          text: `${currentPage} / ${pageCount}`,
          alignment: "right",
          color: theme.colours.muted,
          fontSize: theme.baseFontSize * 0.8,
        },
      ],
      margin: [theme.pageMargins[0], 12, theme.pageMargins[2], 0],
    });
  }

  if (state.droppedGlyphs.size > 0) {
    state.warnings.push(
      `These characters were removed because no bundled font can draw them: ${[...state.droppedGlyphs].join(" ")}. Emoji and non-Latin scripts are not supported.`,
    );
  }

  return {
    docDefinition,
    warnings: [...new Set(state.warnings)],
  };
}
