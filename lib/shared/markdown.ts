import DOMPurify from "dompurify";
import { marked } from "marked";

/**
 * Renders markdown to HTML that is safe to hand to `dangerouslySetInnerHTML`.
 *
 * `marked` deliberately passes raw HTML in the source straight through — it has
 * no `sanitize` option any more — so anything rendered without this helper is a
 * DOM XSS waiting to happen (`<img src=x onerror=...>` in pasted markdown).
 *
 * DOMPurify needs a real DOM, which does not exist during server rendering.
 * Callers must therefore only invoke this in the browser; `useSanitisedMarkdown`
 * exists to enforce that. Returning unsanitised markup when no DOM is available
 * would ship the exact payload we are guarding against to the client.
 */
export function renderMarkdown(source: string): string {
  if (!DOMPurify.isSupported) return "";

  const rendered = marked.parse(source, { gfm: true, async: false });
  return DOMPurify.sanitize(rendered);
}
